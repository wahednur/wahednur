"""Recurring invoices: a saved template that makes one invoice per period.

A daily job (billing.tasks.run_recurring_invoices) calls run_due(). Each invoice is tied to its run
date by a unique pair, so running the job twice, or after a long break, never bills a date twice.
"""

import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record

from . import services
from .models import RecurringInvoice, RecurringItem, RecurringRun

F = RecurringInvoice.Frequency
S = RecurringInvoice.Status
MAX_CATCH_UP = 12  # never create more than this many invoices for one template in one run


def _fail(field, message):
    raise ValidationError({field: message})


def add_months(d: date, months: int, anchor_day: int | None = None) -> date:
    """Moves forward whole months and keeps the billing day: 31 Jan, 28 Feb, 31 Mar."""
    index = d.year * 12 + (d.month - 1) + months
    year, month = divmod(index, 12)
    month += 1
    return date(year, month, min(anchor_day or d.day, calendar.monthrange(year, month)[1]))


def advance(d: date, frequency: str, anchor_day: int) -> date:
    if frequency == F.WEEKLY:
        return d + timedelta(days=7)
    months = {F.MONTHLY: 1, F.QUARTERLY: 3, F.YEARLY: 12}[frequency]
    return add_months(d, months, anchor_day)


def visible() -> "RecurringInvoice.objects":
    return RecurringInvoice.objects.select_related("client", "project").prefetch_related("items")


def get(pk) -> RecurringInvoice:
    try:
        return visible().get(pk=pk)
    except (RecurringInvoice.DoesNotExist, ValueError):
        raise NotFound() from None


def _check(items, data):
    services._check_items(items, data.get("discount", Decimal(0)))
    services._check_tax(data)
    if data.get("due_days", 0) < 0 or data.get("due_days", 0) > 365:
        _fail("due_days", "Payment terms must be between 0 and 365 days.")
    end = data.get("end_date")
    if end and end < data["start_date"]:
        _fail("end_date", "The end date cannot be before the start date.")


@transaction.atomic
def save_recurring(
    *, user, items, recurring=None, client=None, project=None, **data
) -> RecurringInvoice:
    if recurring is not None:
        client, project = recurring.client, recurring.project
    project = services.project_for(client=client, project=project)
    client = project.client
    services._check_currency(project, data.get("currency", "BDT"))
    _check(items, data)
    data["prefix"] = services._clean_prefix(data.get("prefix"), "INV")
    if not data.get("bill_to_address"):
        data["bill_to_address"] = services.default_address(client)
    if recurring is None:
        recurring = RecurringInvoice(
            client=client, project=project, created_by=user, next_run=data["start_date"], **data
        )
    else:
        if recurring.status == S.ENDED:
            _fail("detail", "An ended schedule cannot be edited. Create a new one.")
        for field, value in data.items():
            setattr(recurring, field, value)
        if recurring.runs.count() == 0:
            recurring.next_run = (
                recurring.start_date
            )  # nothing was billed yet: follow the start date
    recurring.save()
    recurring.items.all().delete()
    RecurringItem.objects.bulk_create(
        [
            RecurringItem(
                recurring=recurring,
                position=n,
                description=i["description"],
                quantity=i["quantity"],
                unit_price=i["unit_price"],
            )
            for n, i in enumerate(items)
        ]
    )
    record("recurring_saved", user=user)
    return recurring


def _set(rec: RecurringInvoice, status: str, allowed: tuple, message: str, user, event: str):
    if rec.status not in allowed:
        _fail("detail", message)
    rec.status = status
    rec.save(update_fields=["status"])
    record(event, user=user)
    return rec


def pause(*, rec, user):
    return _set(
        rec,
        S.PAUSED,
        (S.ACTIVE,),
        "Only an active schedule can be paused.",
        user,
        "recurring_paused",
    )


def resume(*, rec, user):
    # Paused time is not billed afterwards: the next run moves to the next date after today.
    if rec.status != S.PAUSED:
        _fail("detail", "Only a paused schedule can be resumed.")
    today = timezone.localdate()
    while rec.next_run < today:
        rec.next_run = advance(rec.next_run, rec.frequency, rec.start_date.day)
    rec.status = S.ACTIVE
    rec.save(update_fields=["status", "next_run"])
    record("recurring_resumed", user=user)
    return rec


def end(*, rec, user):
    return _set(
        rec,
        S.ENDED,
        (S.ACTIVE, S.PAUSED),
        "This schedule has already ended.",
        user,
        "recurring_ended",
    )


def _invoice_items(rec):
    return [
        {
            "description": i.description,
            "quantity": i.quantity,
            "unit_price": i.unit_price,
            "cycle": "one_time",
        }
        for i in rec.items.all()
    ]


def _run_one(rec: RecurringInvoice, run_date: date) -> bool:
    """Makes the invoice for run_date. False if that date was already billed."""
    if RecurringRun.objects.filter(recurring=rec, run_date=run_date).exists():
        return False
    try:
        with transaction.atomic():
            invoice = services.save_invoice(
                user=rec.created_by,
                items=_invoice_items(rec),
                installments=[],
                project=rec.project,
                title=rec.title,
                currency=rec.currency,
                discount=rec.discount,
                notes=rec.notes,
                tax_name=rec.tax_name,
                tax_rate=rec.tax_rate,
                bill_to_address=rec.bill_to_address,
                prefix=rec.prefix,
                issue_date=run_date,
                due_date=run_date + timedelta(days=rec.due_days),
            )
            RecurringRun.objects.create(recurring=rec, run_date=run_date, invoice=invoice)
    except IntegrityError:
        return False
    if rec.auto_issue:
        services.issue_invoice(invoice=invoice, user=rec.created_by)
    return True


def run_due(today: date | None = None) -> int:
    """Daily job. Returns how many invoices were made."""
    today = today or timezone.localdate()
    made = 0
    for rec in visible().filter(status=S.ACTIVE, next_run__lte=today):
        for _ in range(MAX_CATCH_UP):
            if rec.next_run > today:
                break
            if rec.end_date and rec.next_run > rec.end_date:
                rec.status = S.ENDED
                break
            if _run_one(rec, rec.next_run):
                made += 1
            rec.next_run = advance(rec.next_run, rec.frequency, rec.start_date.day)
        if rec.end_date and rec.next_run > rec.end_date and rec.status == S.ACTIVE:
            rec.status = S.ENDED
        rec.save(update_fields=["next_run", "status"])
    return made


def out(rec: RecurringInvoice) -> dict:
    from .serializers import exact

    gross = sum((services.money(i.quantity * i.unit_price) for i in rec.items.all()), Decimal(0))
    base = services.money(gross - rec.discount)
    tax = services.money(base * rec.tax_rate / 100) if rec.tax_rate else Decimal(0)
    return exact(
        {
            "id": rec.id,
            "client": rec.client_id,
            "client_email": rec.client.email,
            "project": rec.project_id,
            "project_title": rec.project.title,
            "title": rec.title,
            "prefix": rec.prefix,
            "currency": rec.currency,
            "discount": rec.discount,
            "tax_name": rec.tax_name,
            "tax_rate": rec.tax_rate,
            "notes": rec.notes,
            "bill_to_address": rec.bill_to_address,
            "frequency": rec.frequency,
            "start_date": rec.start_date,
            "next_run": rec.next_run if rec.status == S.ACTIVE else None,
            "end_date": rec.end_date,
            "due_days": rec.due_days,
            "auto_issue": rec.auto_issue,
            "status": rec.status,
            "subtotal": gross,
            "tax": tax,
            "total": base + tax,
            "items": [
                {"description": i.description, "quantity": i.quantity, "unit_price": i.unit_price}
                for i in rec.items.all()
            ],
            "invoices": [
                {
                    "id": r.invoice_id,
                    "number": r.invoice.number,
                    "run_date": r.run_date,
                    "status": r.invoice.status,
                }
                for r in rec.runs.select_related("invoice")[:24]
            ],
            "created_at": rec.created_at,
        }
    )

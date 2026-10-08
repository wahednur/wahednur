"""Billing rules. Money is Decimal; totals are computed here, never trusted from the UI."""

import re
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record

from .models import (
    Counter,
    Installment,
    Invoice,
    InvoiceItem,
    Payment,
    Quotation,
    QuotationItem,
    money,
)

ZERO = Decimal("0.00")


def _fail(field, message):
    raise ValidationError({field: message})


# --- numbering ------------------------------------------------------------------
PREFIX_RE = re.compile(r"^[A-Z][A-Z0-9]{1,7}$")
NUMBER_RE = re.compile(r"^[A-Z0-9][A-Z0-9-]{0,29}$")


def next_number(prefix: str, year: int | None = None) -> str:
    """QUO-2026-0001 / INV-2026-0001. Locked row, so two requests never get the same number."""
    year = year or timezone.localdate().year
    with transaction.atomic():
        counter, _ = Counter.objects.select_for_update().get_or_create(kind=prefix, year=year)
        counter.last += 1
        counter.save(update_fields=["last"])
    return f"{prefix}-{year}-{counter.last:04d}"


def preview_number(prefix: str) -> str:
    """The number the next document with this prefix would get (not reserved)."""
    year = timezone.localdate().year
    last = (
        Counter.objects.filter(kind=prefix, year=year).values_list("last", flat=True).first() or 0
    )
    return f"{prefix}-{year}-{last + 1:04d}"


def _clean_prefix(prefix: str, default: str) -> str:
    prefix = (prefix or default).strip().upper()
    if not PREFIX_RE.match(prefix):
        _fail("prefix", "Use 2 to 8 capital letters or digits, starting with a letter.")
    return prefix


def _resolve_number(model, prefix: str, wanted: str, current=None) -> str:
    """The number typed by the owner (checked) or the next free one for this prefix."""
    wanted = (wanted or "").strip().upper()
    if not wanted:
        return current.number if current else next_number(prefix)
    if not NUMBER_RE.match(wanted):
        _fail("number", "Use capital letters, digits and dashes only.")
    taken = model.objects.filter(number=wanted)
    if current is not None:
        taken = taken.exclude(pk=current.pk)
    if taken.exists():
        _fail("number", f"{wanted} is already used.")
    return wanted


# --- totals ---------------------------------------------------------------------
def subtotal(doc) -> Decimal:
    """Only counted items are billed; an item marked 'not counted' is shown but adds nothing."""
    return sum((i.amount for i in doc.items.all() if i.counted), ZERO)


def subtotal_max(doc) -> Decimal | None:
    """The top of the estimate if any item has a price range, else None."""
    items = [i for i in doc.items.all() if i.counted]
    if not any(i.unit_price_max for i in items):
        return None
    return sum((money(i.quantity * (i.unit_price_max or i.unit_price)) for i in items), ZERO)


def taxable(doc) -> Decimal:
    return money(subtotal(doc) - doc.discount)


def tax_amount(doc) -> Decimal:
    """Sales tax on what is left after the discount. Zero when no tax is chosen."""
    return money(taxable(doc) * doc.tax_rate / 100) if doc.tax_rate else ZERO


def total(doc) -> Decimal:
    return taxable(doc) + tax_amount(doc)


def _check_tax(data):
    rate = data.get("tax_rate") or Decimal(0)
    if rate < 0 or rate > 100:
        _fail("tax_rate", "The tax rate must be between 0 and 100.")
    if rate and not (data.get("tax_name") or "").strip():
        _fail("tax_name", "Name the tax, for example VAT.")
    if not rate:
        data["tax_name"] = ""
        data["tax_rate"] = Decimal(0)


def _gross(items) -> Decimal:
    return sum(
        (money(i["quantity"] * i["unit_price"]) for i in items if i.get("counted", True)), ZERO
    )


def _grand_total(items, discount, tax_rate) -> Decimal:
    gross = _gross(items)
    base = money(gross - discount)
    return base + (money(base * tax_rate / 100) if tax_rate else ZERO)


def _check_items(items, discount):
    if not items:
        _fail("items", "Add at least one item.")
    for item in items:
        if item["quantity"] <= 0 or item["unit_price"] < 0:
            _fail("items", "Quantity must be above zero and price cannot be negative.")
        top = item.get("unit_price_max")
        if top is not None and top < item["unit_price"]:
            _fail("items", "The top of a price range cannot be below the price.")
    gross = _gross(items)
    if discount < 0 or discount > gross:
        _fail("discount", "The discount cannot be negative or more than the subtotal.")
    if gross - discount <= 0:
        _fail("items", "The total must be above zero.")


def _write_items(model, fk, doc, items):
    model.objects.filter(**{fk: doc}).delete()
    model.objects.bulk_create(
        [model(**{fk: doc}, position=n, **item) for n, item in enumerate(items)]
    )


# --- visibility -------------------------------------------------------------------
def visible_quotations(user):
    qs = Quotation.objects.select_related("project__client").prefetch_related("items")
    if user.is_staff:
        return qs
    return qs.filter(project__client=user).exclude(status=Quotation.Status.DRAFT)


def visible_invoices(user):
    qs = Invoice.objects.select_related("project__client").prefetch_related(
        "items", "installments", "payments"
    )
    if user.is_staff:
        return qs
    return qs.filter(project__client=user).exclude(status=Invoice.Status.DRAFT)


def _get(qs, pk):
    try:
        return qs.get(pk=pk)
    except (qs.model.DoesNotExist, ValueError):
        raise NotFound() from None


def get_quotation(user, pk) -> Quotation:
    return _get(visible_quotations(user), pk)


def get_invoice(user, pk) -> Invoice:
    return _get(visible_invoices(user), pk)


# --- email ------------------------------------------------------------------------
def _notify(doc, subject, line, path):
    client = doc.project.client
    send_mail(
        subject,
        f"{line}\n\nOpen it here: {settings.FRONTEND_URL}{path}\n\n{settings.BUSINESS_NAME}",
        settings.DEFAULT_FROM_EMAIL,
        [client.email],
        fail_silently=True,  # the document is already saved; a mail problem must not undo it
    )
    from notifications.services import notify

    if not client.is_staff:
        kind = "quotation" if subject.startswith("Quotation") else "invoice"
        notify(client, kind=kind, title=subject, body=line, url=path)


def project_for(*, client=None, project=None, user=None):
    """The project a document belongs to. A client alone gets one 'General billing' project."""
    from projects.models import Project

    if project is not None:
        if client is not None and project.client_id != client.pk:
            _fail("project", "That project belongs to a different client.")
        return project
    if client is None:
        _fail("client", "Choose a client.")
    found = Project.objects.filter(
        client=client, title=GENERAL_PROJECT, is_system=False, deleted_at__isnull=True
    ).first()
    return found or Project.objects.create(client=client, title=GENERAL_PROJECT, status="active")


def default_address(client) -> str:
    profile = getattr(client, "client_profile", None)
    if profile is None:
        return ""
    lines = [profile.company or profile.full_name, profile.address]
    return "\n".join(x for x in lines if x)


GENERAL_PROJECT = "General billing"


def client_currency(project) -> str:
    """Local clients are billed in taka, foreign clients in dollars. Shop orders are exempt."""
    profile = getattr(project.client, "client_profile", None)
    return profile.currency if profile else "BDT"


def _check_currency(project, currency):
    if project.is_system:
        return
    need = client_currency(project)
    if currency != need:
        who = (
            "A local client is billed in BDT"
            if need == "BDT"
            else "A foreign client is billed in USD"
        )
        _fail("currency", f"{who}. Change the client's type first if that is wrong.")


# --- quotations -------------------------------------------------------------------
def _common(doc, data, *, model, default_prefix, project=None):
    """Checks shared by quotations and invoices. Fills in the prefix, number and address."""
    _check_tax(data)
    data["prefix"] = _clean_prefix(
        data.get("prefix") or (doc.prefix if doc else ""), default_prefix
    )
    wanted = data.pop("number", "")
    data["number"] = _resolve_number(model, data["prefix"], wanted, doc)
    if not data.get("bill_to_address") and doc is None and project is not None:
        data["bill_to_address"] = default_address(project.client)
    return data


def _clean_blocks(data):
    """The proposal's extra parts, as plain JSON (no Decimals), with the payment plan checked."""
    data["sections"] = [dict(x) for x in data.get("sections", [])]
    data["risks"] = [dict(x) for x in data.get("risks", [])]
    plan = [
        {"label": x["label"], "percent": str(x["percent"]), "note": x.get("note", "")}
        for x in data.get("payment_plan", [])
    ]
    if plan and sum(Decimal(x["percent"]) for x in plan) != 100:
        _fail("payment_plan", "The payment steps must add up to 100%.")
    data["payment_plan"] = plan


@transaction.atomic
def save_quotation(*, user, items, quotation=None, project=None, **data) -> Quotation:
    _check_items(items, data.get("discount", ZERO))
    _check_currency(project or quotation.project, data.get("currency", "BDT"))
    data = _common(quotation, data, model=Quotation, default_prefix="QUO", project=project)
    _clean_blocks(data)
    if quotation is None:
        quotation = Quotation(project=project, created_by=user, **data)
    else:
        if quotation.status != Quotation.Status.DRAFT:
            _fail("detail", "Only a draft quotation can be edited.")
        for field, value in data.items():
            setattr(quotation, field, value)
    quotation.save()
    _write_items(QuotationItem, "quotation", quotation, items)
    return quotation


def send_quotation(*, quotation: Quotation, user, request=None) -> Quotation:
    if quotation.status != Quotation.Status.DRAFT:
        _fail("detail", "Only a draft can be sent.")
    quotation.status = Quotation.Status.SENT
    quotation.sent_at = timezone.now()
    quotation.save(update_fields=["status", "sent_at"])
    record("quotation_sent", request=request, user=user)
    _notify(
        quotation,
        f"Quotation {quotation.number}",
        f"A quotation ({quotation.number}) is ready for you to review.",
        f"/app/billing/quotations/{quotation.pk}",
    )
    return quotation


def decide_quotation(*, quotation: Quotation, accept: bool, user, request=None) -> Quotation:
    if quotation.status != Quotation.Status.SENT:
        _fail("detail", "Only a sent quotation can be accepted or declined.")
    if quotation.valid_until and quotation.valid_until < timezone.localdate():
        quotation.status = Quotation.Status.EXPIRED
        quotation.save(update_fields=["status"])
        _fail("detail", "This quotation has expired.")
    quotation.status = Quotation.Status.ACCEPTED if accept else Quotation.Status.REJECTED
    quotation.decided_at = timezone.now()
    quotation.save(update_fields=["status", "decided_at"])
    record("quotation_accepted" if accept else "quotation_rejected", request=request, user=user)
    return quotation


def mark_dead(*, quotation: Quotation, user, request=None) -> Quotation:
    """We drop a quotation: the client went quiet or it no longer applies."""
    if quotation.status not in (Quotation.Status.DRAFT, Quotation.Status.SENT):
        _fail("detail", "Only a draft or delivered quotation can be marked dead.")
    quotation.status = Quotation.Status.DEAD
    quotation.decided_at = timezone.now()
    quotation.save(update_fields=["status", "decided_at"])
    record("quotation_dead", request=request, user=user)
    return quotation


# --- invoices ---------------------------------------------------------------------
def _installments(plan, grand_total):
    """plan: [{label, percent | amount, due_date?}]. Must add up to the invoice total exactly."""
    if not plan:
        plan = [{"label": "Full payment", "percent": Decimal(100)}]
    rows, running = [], ZERO
    for n, step in enumerate(plan):
        last = n == len(plan) - 1
        if step.get("percent") is not None:
            amount = money(grand_total * step["percent"] / 100)
        elif step.get("amount") is not None:
            amount = money(step["amount"])
        else:
            _fail("installments", "Each installment needs a percent or an amount.")
        if last and step.get("percent") is not None:
            amount = grand_total - running  # the last one absorbs rounding
        if amount <= 0:
            _fail("installments", "Each installment must be above zero.")
        running += amount
        rows.append({"label": step["label"], "amount": amount, "due_date": step.get("due_date")})
    if running != grand_total:
        _fail("installments", f"Installments add up to {running}, but the total is {grand_total}.")
    return rows


@transaction.atomic
def save_invoice(
    *, user, items, installments, invoice=None, project=None, quotation=None, **data
) -> Invoice:
    _check_items(items, data.get("discount", ZERO))
    _check_currency(project or invoice.project, data.get("currency", "BDT"))
    data = _common(invoice, data, model=Invoice, default_prefix="INV", project=project)
    if invoice is None:
        invoice = Invoice(
            project=project,
            quotation=quotation,
            created_by=user,
            **data,
        )
    else:
        if invoice.status != Invoice.Status.DRAFT:
            _fail("detail", "An issued invoice cannot be edited. Cancel it and create a new one.")
        for field, value in data.items():
            setattr(invoice, field, value)
    invoice.save()
    _write_items(InvoiceItem, "invoice", invoice, items)
    rows = _installments(installments, _grand_total(items, invoice.discount, invoice.tax_rate))
    invoice.installments.all().delete()
    Installment.objects.bulk_create(
        [Installment(invoice=invoice, position=n, **row) for n, row in enumerate(rows)]
    )
    return invoice


@transaction.atomic
def convert_quotation(
    *, quotation: Quotation, installments, due_date, user, request=None
) -> Invoice:
    if quotation.status != Quotation.Status.ACCEPTED:
        _fail("detail", "Only an accepted quotation can become an invoice.")
    if Invoice.objects.filter(quotation=quotation).exists():
        _fail("detail", "This quotation already has an invoice.")
    items = [
        {
            "description": i.description,
            "quantity": i.quantity,
            "unit_price": i.unit_price,
            "cycle": i.cycle,
            "details": i.details,
            "time_estimate": i.time_estimate,
            "risk": i.risk,
            "work_state": i.work_state,
            "note": i.note,
            "unit_price_max": None,  # the invoice bills the agreed price, not a range
            "counted": i.counted,
        }
        for i in quotation.items.all()
    ]
    if not installments and quotation.payment_plan:
        installments = [
            {"label": x["label"], "percent": Decimal(x["percent"])} for x in quotation.payment_plan
        ]
    invoice = save_invoice(
        user=user,
        items=items,
        installments=installments,
        project=quotation.project,
        quotation=quotation,
        title=quotation.title,
        currency=quotation.currency,
        discount=quotation.discount,
        notes=quotation.notes,
        tax_name=quotation.tax_name,
        tax_rate=quotation.tax_rate,
        bill_to_address=quotation.bill_to_address,
        subtitle=quotation.subtitle,
        revision=quotation.revision,
        due_date=due_date,
    )
    record("invoice_from_quotation", request=request, user=user)
    return invoice


def issue_invoice(*, invoice: Invoice, user, request=None) -> Invoice:
    if invoice.status != Invoice.Status.DRAFT:
        _fail("detail", "Only a draft invoice can be issued.")
    invoice.status = Invoice.Status.ISSUED
    invoice.issued_at = timezone.now()
    invoice.save(update_fields=["status", "issued_at"])
    record("invoice_issued", request=request, user=user)
    _notify(
        invoice,
        f"Invoice {invoice.number}",
        f"Invoice {invoice.number} has been issued for {invoice.project.title}.",
        f"/app/billing/invoices/{invoice.pk}",
    )
    return invoice


def cancel_invoice(*, invoice: Invoice, user, request=None) -> Invoice:
    if invoice.status == Invoice.Status.CANCELLED:
        return invoice
    if invoice.payments.exists():
        _fail("detail", "An invoice with payments cannot be cancelled.")
    invoice.status = Invoice.Status.CANCELLED
    invoice.save(update_fields=["status"])
    record("invoice_cancelled", request=request, user=user)
    return invoice


# --- payments ---------------------------------------------------------------------
def paid_total(invoice) -> Decimal:
    return invoice.payments.aggregate(t=Sum("amount"))["t"] or ZERO


def outstanding(invoice) -> Decimal:
    return total(invoice) - paid_total(invoice)


def payment_state(invoice) -> str:
    if invoice.status != Invoice.Status.ISSUED:
        return invoice.status
    paid = paid_total(invoice)
    if paid >= total(invoice):
        return "paid"
    return "partial" if paid > 0 else "unpaid"


def schedule(invoice, today=None):
    """Spread what was paid over the installments in order. Nothing stored, so it cannot drift."""
    left = paid_total(invoice)
    today = today or timezone.localdate()
    rows = []
    for inst in invoice.installments.all():
        paid = min(left, inst.amount)
        left -= paid
        if paid >= inst.amount:
            state = "paid"
        elif inst.due_date and inst.due_date < today:
            state = "overdue"
        else:
            state = "partial" if paid > 0 else "due"
        rows.append({"inst": inst, "paid": paid, "state": state})
    return rows


@transaction.atomic
def record_payment(*, invoice: Invoice, user, request=None, **data) -> Payment:
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)  # serialise payments
    if invoice.status != Invoice.Status.ISSUED:
        _fail("detail", "Payments can only be recorded on an issued invoice.")
    amount = money(data["amount"])
    if amount <= 0:
        _fail("amount", "The amount must be above zero.")
    if amount > outstanding(invoice):
        _fail("amount", f"This is more than the amount still due ({outstanding(invoice)}).")
    payment = Payment.objects.create(
        invoice=invoice, recorded_by=user, **{**data, "amount": amount}
    )
    record("payment_recorded", request=request, user=user)
    from notifications.services import notify

    client = invoice.project.client
    if not client.is_staff and not invoice.project.is_system:
        notify(
            client, kind="payment", title=f"Payment received: {invoice.number}",
            body=f"We recorded {invoice.currency} {amount:,.2f}. Thank you.", url=f"/app/billing/invoices/{invoice.pk}",
        )
    return payment


# --- payment reminders ------------------------------------------------------------
def _fmt(invoice, amount) -> str:
    return f"{invoice.currency} {amount:,.2f}"


def send_reminders(today=None) -> int:
    """Daily job: one polite email before an installment is due and one after it is overdue.

    Each reminder goes out once per installment. Shop orders (hidden system project) are left out:
    they have their own payment flow. Returns how many emails were sent.
    """
    today = today or timezone.localdate()
    ahead = today + timedelta(days=settings.REMINDER_DAYS_BEFORE)
    sent = 0
    invoices = Invoice.objects.filter(
        status=Invoice.Status.ISSUED, project__is_system=False
    ).select_related("project__client")
    for invoice in invoices:
        for row in schedule(invoice, today):
            inst, state = row["inst"], row["state"]
            if state == "paid" or not inst.due_date:
                continue
            owed = inst.amount - row["paid"]
            if state == "overdue" and not inst.reminded_overdue_at:
                field = "reminded_overdue_at"
                subject = f"Payment past its due date: {invoice.number}"
                line = (
                    f"{inst.label} of invoice {invoice.number} ({_fmt(invoice, owed)}) "
                    f"was due on {inst.due_date:%d %b %Y}. If you have already paid, please "
                    "ignore this note and send me the reference. If the date does not suit you, "
                    "reply and we will agree a new one."
                )
            elif state != "overdue" and inst.due_date <= ahead and not inst.reminded_soon_at:
                field = "reminded_soon_at"
                subject = f"Payment due soon: {invoice.number}"
                line = (
                    f"{inst.label} of invoice {invoice.number} ({_fmt(invoice, owed)}) "
                    f"is due on {inst.due_date:%d %b %Y}."
                )
            else:
                continue
            try:
                send_mail(
                    subject,
                    f"{line}\n\nOpen it here: {settings.FRONTEND_URL}/app/billing/invoices/"
                    f"{invoice.pk}\n\n{settings.BUSINESS_NAME}",
                    settings.DEFAULT_FROM_EMAIL,
                    [invoice.project.client.email],
                )
            except Exception:  # a mail problem: try again tomorrow
                continue
            setattr(inst, field, timezone.now())
            inst.save(update_fields=[field])
            sent += 1
    return sent

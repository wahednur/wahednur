"""Accounting = payments in (from billing) minus expenses out, always kept per currency.

Nothing here stores a total: every figure is calculated from the source rows, so a report can
never disagree with the invoices and expenses behind it.
"""

import csv
import io
from collections import defaultdict
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record
from billing import services as billing
from billing.models import Invoice, Payment

from .models import Expense

ZERO = Decimal("0.00")


def expenses_qs():
    return Expense.objects.filter(deleted_at__isnull=True)


def save_expense(*, user, expense=None, request=None, **data) -> Expense:
    if data["amount"] <= 0:
        raise ValidationError({"amount": "The amount must be above zero."})
    receipt = data.get("receipt")
    if receipt and receipt.deleted_at:
        raise ValidationError({"receipt": "That document has been removed."})
    if expense is None:
        expense = Expense(recorded_by=user)
    for field, value in data.items():
        setattr(expense, field, value)
    expense.save()
    record("expense_saved", request=request, user=user)
    return expense


def get_expense(pk) -> Expense:
    try:
        return expenses_qs().get(pk=pk)
    except (Expense.DoesNotExist, ValueError):
        raise NotFound() from None


def delete_expense(*, expense: Expense, user, request=None):
    expense.deleted_at = timezone.now()
    expense.save(update_fields=["deleted_at"])
    record("expense_deleted", request=request, user=user)


def date_range(qs, field, start, end):
    if start:
        qs = qs.filter(**{f"{field}__gte": start})
    if end:
        qs = qs.filter(**{f"{field}__lte": end})
    return qs


def _payments(start, end):
    qs = Payment.objects.exclude(invoice__status=Invoice.Status.CANCELLED)
    return date_range(qs, "paid_on", start, end)


def _by_currency(rows):
    """[(currency, value)] -> {currency: Decimal}"""
    out = defaultdict(lambda: ZERO)
    for currency, value in rows:
        out[currency] += value or ZERO
    return out


def summary(start=None, end=None) -> dict:
    """Per currency: received, spent, net, monthly breakdown, and what is still owed to us."""
    income = _by_currency(
        _payments(start, end).values_list("invoice__currency").annotate(t=Sum("amount"))
    )
    spent = _by_currency(
        date_range(expenses_qs(), "spent_on", start, end)
        .values_list("currency")
        .annotate(t=Sum("amount"))
    )
    months: dict = defaultdict(lambda: defaultdict(lambda: {"received": ZERO, "spent": ZERO}))
    for month, cur, total in (
        _payments(start, end)
        .annotate(m=TruncMonth("paid_on"))
        .values_list("m", "invoice__currency")
        .annotate(t=Sum("amount"))
    ):
        months[cur][month.strftime("%Y-%m")]["received"] += total
    for month, cur, total in (
        date_range(expenses_qs(), "spent_on", start, end)
        .annotate(m=TruncMonth("spent_on"))
        .values_list("m", "currency")
        .annotate(t=Sum("amount"))
    ):
        months[cur][month.strftime("%Y-%m")]["spent"] += total

    owed, overdue = defaultdict(lambda: ZERO), defaultdict(lambda: ZERO)
    for inv in Invoice.objects.filter(status=Invoice.Status.ISSUED).prefetch_related(
        "items", "payments", "installments"
    ):
        owed[inv.currency] += billing.outstanding(inv)
        overdue[inv.currency] += sum(
            (
                r["inst"].amount - r["paid"]
                for r in billing.schedule(inv)
                if r["state"] == "overdue"
            ),
            ZERO,
        )

    result = {}
    for cur in sorted({*income, *spent, *owed}):
        result[cur] = {
            "received": income[cur],
            "spent": spent[cur],
            "net": income[cur] - spent[cur],
            "receivable": owed[cur],
            "overdue": overdue[cur],
            "months": [
                {"month": m, **v} | {"net": v["received"] - v["spent"]}
                for m, v in sorted(months[cur].items())
            ],
        }
    return result


def project_profit(start=None, end=None) -> list[dict]:
    """Per project and currency: invoiced, received, expenses and what is left."""
    rows: dict = {}

    def cell(project_id, title, cur):
        return rows.setdefault(
            (project_id, cur),
            {
                "project": project_id,
                "title": title,
                "currency": cur,
                "invoiced": ZERO,
                "received": ZERO,
                "spent": ZERO,
            },
        )

    for inv in (
        Invoice.objects.filter(status=Invoice.Status.ISSUED)
        .select_related("project")
        .prefetch_related("items")
    ):
        cell(inv.project_id, inv.project.title, inv.currency)["invoiced"] += billing.total(inv)
    for pid, title, cur, total in (
        _payments(start, end)
        .values_list("invoice__project_id", "invoice__project__title", "invoice__currency")
        .annotate(t=Sum("amount"))
    ):
        cell(pid, title, cur)["received"] += total
    for pid, title, cur, total in (
        date_range(expenses_qs().filter(project__isnull=False), "spent_on", start, end)
        .values_list("project_id", "project__title", "currency")
        .annotate(t=Sum("amount"))
    ):
        cell(pid, title, cur)["spent"] += total
    out = []
    for row in rows.values():
        row["net"] = row["received"] - row["spent"]
        out.append(row)
    return sorted(out, key=lambda r: (r["title"], r["currency"]))


def _safe(cell) -> str:
    """Stop spreadsheet formula injection: a cell starting with = + - @ would run as a formula."""
    text = "" if cell is None else str(cell)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


def ledger_csv(start=None, end=None) -> str:
    """One chronological list of money in and out, for the accountant."""
    lines = []
    for p in _payments(start, end).select_related("invoice__project"):
        lines.append(
            (
                p.paid_on,
                "income",
                p.invoice.number,
                p.invoice.project.title,
                p.get_method_display(),
                p.reference,
                p.invoice.currency,
                p.amount,
            )
        )
    for e in date_range(expenses_qs(), "spent_on", start, end).select_related("project"):
        lines.append(
            (
                e.spent_on,
                "expense",
                e.get_category_display(),
                e.project.title if e.project else "",
                e.vendor,
                e.description,
                e.currency,
                -e.amount,
            )
        )
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(
        ["date", "type", "reference", "project", "method or vendor", "note", "currency", "amount"]
    )
    for row in sorted(lines, key=lambda r: (r[0], r[1])):
        writer.writerow([row[0].isoformat(), *[_safe(c) for c in row[1:7]], f"{row[7]:.2f}"])
    return out.getvalue()

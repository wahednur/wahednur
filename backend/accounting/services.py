"""Accounting = payments in (from billing) minus expenses out, always kept per currency.

Nothing here stores a total: every figure is calculated from the source rows, so a report can
never disagree with the invoices and expenses behind it.
"""

import csv
import io
from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record
from billing import services as billing
from billing.models import Invoice, Payment

from .models import Expense, ExternalIncome, Settlement

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


def incomes_qs():
    return ExternalIncome.objects.filter(deleted_at__isnull=True)


def settlements_qs():
    return Settlement.objects.filter(deleted_at__isnull=True)


def _get(qs, pk):
    try:
        return qs.get(pk=pk)
    except (qs.model.DoesNotExist, ValueError):
        raise NotFound() from None


def get_income(pk) -> ExternalIncome:
    return _get(incomes_qs(), pk)


def get_settlement(pk) -> Settlement:
    return _get(settlements_qs(), pk)


def save_income(*, user, income=None, request=None, **data) -> ExternalIncome:
    if data["amount"] <= 0:
        raise ValidationError({"amount": "The amount must be above zero."})
    income = income or ExternalIncome(recorded_by=user)
    for field, value in data.items():
        setattr(income, field, value)
    income.save()
    record("income_saved", request=request, user=user)
    return income


def save_settlement(*, user, settlement=None, request=None, **data) -> Settlement:
    s = settlement or Settlement(recorded_by=user)
    for field, value in data.items():
        setattr(s, field, value)
    if s.earned_usd <= 0 or s.received_bdt <= 0:
        raise ValidationError({"detail": "Enter the dollars earned and the taka received."})
    negatives = (
        s.marketplace_fee_usd, s.transfer_fee_usd, s.bank_charge_bdt, s.vat_bdt,
        s.tax_withheld_bdt, s.other_charge_bdt,
    )  # fmt: skip
    if any(v < 0 for v in negatives):
        raise ValidationError({"detail": "Fees, charges and taxes cannot be negative."})
    if s.converted_usd <= 0:
        raise ValidationError(
            {"detail": "The fees are as large as the dollars earned: nothing was sold."}
        )
    if s.reference_rate is not None and s.reference_rate <= 0:
        raise ValidationError({"reference_rate": "The rate must be above zero."})
    s.save()
    record("settlement_saved", request=request, user=user)
    return s


def delete_record(*, obj, user, request=None):
    obj.deleted_at = timezone.now()
    obj.save(update_fields=["deleted_at"])
    record("accounting_record_deleted", request=request, user=user)


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
    for cur, total in (
        date_range(incomes_qs(), "earned_on", start, end)
        .values_list("currency")
        .annotate(t=Sum("amount"))
    ):
        income[cur] += total  # Upwork, Fiverr and other income outside the app's invoices
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

    for month, cur, total in (
        date_range(incomes_qs(), "earned_on", start, end)
        .annotate(m=TruncMonth("earned_on"))
        .values_list("m", "currency")
        .annotate(t=Sum("amount"))
    ):
        months[cur][month.strftime("%Y-%m")]["received"] += total
    # Costs of turning dollars into taka: fees in dollars, bank charges and VAT in taka.
    # Tax held back at source is shown on its own: it is not a business cost, it counts towards tax.
    tax = defaultdict(lambda: ZERO)
    for s in date_range(settlements_qs(), "settled_on", start, end):
        key = s.settled_on.strftime("%Y-%m")
        usd_costs = s.marketplace_fee_usd + s.transfer_fee_usd
        bdt_costs = s.bank_charge_bdt + s.vat_bdt + s.other_charge_bdt
        spent["USD"] += usd_costs
        spent["BDT"] += bdt_costs
        tax["BDT"] += s.tax_withheld_bdt
        months["USD"][key]["spent"] += usd_costs
        months["BDT"][key]["spent"] += bdt_costs

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
    for cur in sorted({*income, *spent, *owed, *tax}):
        result[cur] = {
            "received": income[cur],
            "spent": spent[cur],
            "net": income[cur] - spent[cur],
            "tax_withheld": tax[cur],
            "net_after_tax_withheld": income[cur] - spent[cur] - tax[cur],
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

    def cell(project_id, title, cur, system=False):
        if system:  # every customer's shop invoices are reported as one "Shop sales" line
            project_id, title = None, "Shop sales"
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
        cell(inv.project_id, inv.project.title, inv.currency, inv.project.is_system)[
            "invoiced"
        ] += billing.total(inv)
    for pid, title, cur, system, total in (
        _payments(start, end)
        .values_list(
            "invoice__project_id",
            "invoice__project__title",
            "invoice__currency",
            "invoice__project__is_system",
        )
        .annotate(t=Sum("amount"))
    ):
        cell(pid, title, cur, system)["received"] += total
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


def conversions(start=None, end=None) -> dict:
    """Dollar -> taka: totals, the rate really obtained, and where the money went."""
    rows = list(date_range(settlements_qs(), "settled_on", start, end))
    if not rows:
        return {}
    total = lambda attr: sum((getattr(r, attr) for r in rows), ZERO)  # noqa: E731
    earned, converted = total("earned_usd"), total("converted_usd")
    before = sum((r.before_deductions_bdt for r in rows), ZERO)
    received = total("received_bdt")
    q = lambda v, places: v.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP)  # noqa: E731
    covered = [r for r in rows if r.reference_rate]
    keys = ("value_at_reference_rate", "marketplace_fee", "transfer_fee", "rate_difference",
            "bank_charge", "vat", "tax_withheld", "other", "received")  # fmt: skip
    waterfall = {k: sum((r.waterfall()[k] for r in covered), ZERO) for k in keys}
    return {
        "USD": {
            "count": len(rows),
            "earned": earned,
            "marketplace_fees": total("marketplace_fee_usd"),
            "transfer_fees": total("transfer_fee_usd"),
            "converted": converted,
            "received_bdt": received,
            "bank_charges": total("bank_charge_bdt"),
            "vat": total("vat_bdt"),
            "tax_withheld": total("tax_withheld_bdt"),
            "other_charges": total("other_charge_bdt"),
            "average_rate": q(before / converted, 4),
            "keep_per_dollar": q(received / earned, 4),
            "waterfall": waterfall if covered else None,
            "waterfall_covers": len(covered),
        }
    }


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
    for i in date_range(incomes_qs(), "earned_on", start, end):
        lines.append(
            (
                i.earned_on,
                "income",
                i.get_source_display(),
                "",
                "",
                i.description,
                i.currency,
                i.amount,
            )
        )
    for s in date_range(settlements_qs(), "settled_on", start, end):
        ref = f"payout {s.get_source_display()}"
        rows = (
            ("expense", "marketplace fee", "USD", -s.marketplace_fee_usd),
            ("expense", "transfer fee", "USD", -s.transfer_fee_usd),
            ("conversion", "dollars sold", "USD", -s.converted_usd),
            ("conversion", "taka from the sale", "BDT", s.before_deductions_bdt),
            ("expense", "bank charge", "BDT", -s.bank_charge_bdt),
            ("expense", "VAT", "BDT", -s.vat_bdt),
            ("tax withheld", "tax held at source", "BDT", -s.tax_withheld_bdt),
            ("expense", "other charge", "BDT", -s.other_charge_bdt),
        )
        for kind, what, cur, amount in rows:
            if amount:
                lines.append((s.settled_on, kind, ref, "", what, s.note, cur, amount))
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(
        ["date", "type", "reference", "project", "method or vendor", "note", "currency", "amount"]
    )
    for row in sorted(lines, key=lambda r: (r[0], r[1])):
        writer.writerow([row[0].isoformat(), *[_safe(c) for c in row[1:7]], f"{row[7]:.2f}"])
    return out.getvalue()

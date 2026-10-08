import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

MONEY = {"max_digits": 12, "decimal_places": 2}


def money(value) -> Decimal:
    """Two decimals, halves round up (the way a customer checks it on a calculator)."""
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Currency(models.TextChoices):
    BDT = "BDT", "BDT (৳)"
    USD = "USD", "USD ($)"


class Cycle(models.TextChoices):
    ONE_TIME = "one_time", "One time"
    MONTHLY = "monthly", "Monthly"
    YEARLY = "yearly", "Yearly"


class Counter(models.Model):
    """Last number used per document kind and year, so numbers never repeat or skip."""

    kind = models.CharField(max_length=8)  # the document prefix, for example QUO or INV
    year = models.PositiveIntegerField()
    last = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["kind", "year"], name="uniq_counter")]

    def __str__(self) -> str:
        return f"{self.kind}-{self.year}: {self.last}"


class TaxRate(models.Model):
    """A named sales tax to pick on a quotation or invoice. The rate is copied onto the document."""

    name = models.CharField(max_length=40, unique=True)
    rate = models.DecimalField(max_digits=5, decimal_places=2)
    active = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.rate}%)"


class PricedDocument(models.Model):
    """Fields shared by quotations and invoices."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=30, unique=True)
    prefix = models.CharField(max_length=8, blank=True)
    issue_date = models.DateField(default=timezone.localdate)
    bill_to_address = models.TextField(max_length=500, blank=True)
    subtitle = models.CharField(max_length=300, blank=True)  # one line under the subject
    revision = models.CharField(max_length=20, blank=True)  # for example "Rev A"
    # The tax is copied onto the document, so changing a tax rate later never changes old documents.
    tax_name = models.CharField(max_length=40, blank=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    project = models.ForeignKey("projects.Project", on_delete=models.PROTECT, related_name="+")
    title = models.CharField(max_length=200)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.BDT)
    discount = models.DecimalField(default=0, **MONEY)
    notes = models.TextField(max_length=2000, blank=True)  # shown to the client (terms etc.)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.number


class LineItem(models.Model):
    class Risk(models.TextChoices):
        NONE = "", "Not stated"
        LOW = "low", "Low"
        MID = "mid", "Medium"
        HIGH = "high", "High"

    class WorkState(models.TextChoices):
        NONE = "", "Not stated"
        NEW = "new", "To do"
        PARTIAL = "partial", "Partly done"
        DONE = "done", "Done"

    description = models.CharField(max_length=300)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(**MONEY)
    # A quotation can describe each part of the work like a sheet: what it covers, how long it
    # takes, how risky it is, and a range for the price. Only unit_price is ever billed.
    details = models.TextField(max_length=2000, blank=True)  # one point per line
    time_estimate = models.CharField(max_length=60, blank=True)
    risk = models.CharField(max_length=4, choices=Risk.choices, blank=True)
    work_state = models.CharField(max_length=7, choices=WorkState.choices, blank=True)
    note = models.CharField(max_length=300, blank=True)
    unit_price_max = models.DecimalField(null=True, blank=True, **MONEY)  # top of an estimate range
    counted = models.BooleanField(default=True)  # False: shown, but not in the total
    # The billing rhythm is recorded now; recurring billing itself arrives with subscriptions.
    cycle = models.CharField(max_length=10, choices=Cycle.choices, default=Cycle.ONE_TIME)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        abstract = True
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return self.description

    @property
    def amount(self):
        return money(self.quantity * self.unit_price)


class Quotation(PricedDocument):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Delivered"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Lost"  # the client turned it down or chose someone else
        DEAD = "dead", "Dead"  # we dropped it: no answer, no longer relevant
        EXPIRED = "expired", "Expired"

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    valid_until = models.DateField(null=True, blank=True)
    proposal_text = models.TextField(max_length=5000, blank=True)  # the written proposal
    # Extra parts of the proposal: [{heading, body}], [{risk, impact}], [{label, percent, note}]
    sections = models.JSONField(default=list, blank=True)
    risks = models.JSONField(default=list, blank=True)
    payment_plan = models.JSONField(default=list, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)


class QuotationItem(LineItem):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name="items")


class Invoice(PricedDocument):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ISSUED = "issued", "Issued"
        CANCELLED = "cancelled", "Cancelled"

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    quotation = models.OneToOneField(
        Quotation, null=True, blank=True, on_delete=models.PROTECT, related_name="invoice"
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)


class InvoiceItem(LineItem):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")


class Installment(models.Model):
    """One scheduled part of an invoice (start, middle, final...). Paid state is derived."""

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="installments")
    label = models.CharField(max_length=80)
    amount = models.DecimalField(**MONEY)
    due_date = models.DateField(null=True, blank=True)
    position = models.PositiveIntegerField(default=0)
    # Each reminder is sent once, so the client is never nagged.
    reminded_soon_at = models.DateTimeField(null=True, blank=True)
    reminded_overdue_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return self.label


class Payment(models.Model):
    class Method(models.TextChoices):
        BANK = "bank", "Bank transfer"
        BKASH = "bkash", "bKash"
        NAGAD = "nagad", "Nagad"
        CASH = "cash", "Cash"
        CARD = "card", "Card or gateway"
        OTHER = "other", "Other"

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(**MONEY)
    method = models.CharField(max_length=10, choices=Method.choices)
    reference = models.CharField(max_length=100, blank=True)  # transaction id
    paid_on = models.DateField()
    note = models.CharField(max_length=300, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["paid_on", "id"]

    def __str__(self) -> str:
        return f"{self.invoice.number} {self.amount}"


# --- recurring invoices --------------------------------------------------------------
class RecurringInvoice(models.Model):
    """A template that creates an invoice on a schedule (retainers, hosting, maintenance)."""

    class Frequency(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Every 3 months"
        YEARLY = "yearly", "Yearly"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        ENDED = "ended", "Ended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    project = models.ForeignKey("projects.Project", on_delete=models.PROTECT, related_name="+")
    title = models.CharField(max_length=200)
    prefix = models.CharField(max_length=8, default="INV")
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.BDT)
    discount = models.DecimalField(default=0, **MONEY)
    tax_name = models.CharField(max_length=40, blank=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(max_length=2000, blank=True)
    bill_to_address = models.TextField(max_length=500, blank=True)
    frequency = models.CharField(
        max_length=10, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    start_date = models.DateField()
    next_run = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    due_days = models.PositiveIntegerField(default=15)
    # False: each invoice is a draft for you to check. True: it is issued and emailed by itself.
    auto_issue = models.BooleanField(default=False)
    status = models.CharField(max_length=7, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class RecurringItem(models.Model):
    recurring = models.ForeignKey(RecurringInvoice, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=300)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(**MONEY)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return self.description


class RecurringRun(models.Model):
    """One invoice made for one date. The unique pair makes running the job twice harmless."""

    recurring = models.ForeignKey(RecurringInvoice, on_delete=models.CASCADE, related_name="runs")
    run_date = models.DateField()
    invoice = models.OneToOneField(
        "Invoice", on_delete=models.PROTECT, related_name="recurring_run"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["recurring", "run_date"], name="uniq_recurring_run")
        ]
        ordering = ["-run_date"]

    def __str__(self) -> str:
        return f"{self.recurring_id} {self.run_date}"

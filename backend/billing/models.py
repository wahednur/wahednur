import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import models

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

    kind = models.CharField(max_length=3)
    year = models.PositiveIntegerField()
    last = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["kind", "year"], name="uniq_counter")]

    def __str__(self) -> str:
        return f"{self.kind}-{self.year}: {self.last}"


class PricedDocument(models.Model):
    """Fields shared by quotations and invoices."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=20, unique=True, editable=False)
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
    description = models.CharField(max_length=300)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(**MONEY)
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
        SENT = "sent", "Sent"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    valid_until = models.DateField(null=True, blank=True)
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

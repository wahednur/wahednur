from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import models

from billing.models import Currency


class Expense(models.Model):
    """Money that went out. Money that came in is not stored here: it is the invoice payments."""

    class Category(models.TextChoices):
        HOSTING = "hosting", "Hosting and servers"
        DOMAIN = "domain", "Domains"
        SOFTWARE = "software", "Software and tools"
        CONTRACTOR = "contractor", "Contractors"
        MARKETING = "marketing", "Marketing"
        TRANSPORT = "transport", "Transport"
        FEES = "fees", "Platform and bank fees"
        TAX = "tax", "Tax and licences"
        OTHER = "other", "Other"

    spent_on = models.DateField()
    category = models.CharField(max_length=12, choices=Category.choices, default=Category.OTHER)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.BDT)
    vendor = models.CharField(max_length=150, blank=True)
    description = models.CharField(max_length=300, blank=True)
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    receipt = models.ForeignKey(
        "documents.Document", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-spent_on", "-id"]

    def __str__(self) -> str:
        return f"{self.spent_on} {self.category} {self.amount} {self.currency}"


class ExternalIncome(models.Model):
    """Money earned outside the app's own invoices (Upwork, Fiverr, a client who paid by PayPal...).

    Counted as income in the books. Record the gross amount the client paid; the marketplace fee
    goes in the payout record below, so nothing is counted twice.
    """

    class Source(models.TextChoices):
        UPWORK = "upwork", "Upwork"
        FIVERR = "fiverr", "Fiverr"
        FREELANCER = "freelancer", "Freelancer.com"
        DIRECT = "direct", "Direct client (outside the app)"
        OTHER = "other", "Other"

    earned_on = models.DateField()
    source = models.CharField(max_length=12, choices=Source.choices, default=Source.OTHER)
    description = models.CharField(max_length=300, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-earned_on", "-id"]

    def __str__(self) -> str:
        return f"{self.earned_on} {self.source} {self.amount} {self.currency}"


RATE = {"max_digits": 12, "decimal_places": 4}
MONEY = {"max_digits": 12, "decimal_places": 2}
ONE_CENT = Decimal("0.01")
ONE_PAISA_RATE = Decimal("0.0001")


class Settlement(models.Model):
    """Dollars turned into taka and brought home, with every cut taken on the way.

    Typical path: earn 100 USD, the marketplace keeps a fee, the withdrawal has a fee, the bank
    sells the dollars at its own rate, then takes a service charge, VAT and source tax. You type
    what each statement says; the app works out the rate you really got and where the money went.
    """

    class Source(models.TextChoices):
        UPWORK = "upwork", "Upwork"
        FIVERR = "fiverr", "Fiverr"
        PAYONEER = "payoneer", "Payoneer"
        WISE = "wise", "Wise"
        PAYPAL = "paypal", "PayPal"
        BANK = "bank", "Bank transfer"
        OTHER = "other", "Other"

    settled_on = models.DateField()
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.OTHER)
    note = models.CharField(max_length=300, blank=True)

    earned_usd = models.DecimalField(**MONEY)  # gross, before any fee
    marketplace_fee_usd = models.DecimalField(default=0, **MONEY)
    transfer_fee_usd = models.DecimalField(default=0, **MONEY)  # withdrawal / cross-border fee
    # What you compare against: the market or booked rate (taka per dollar). Optional.
    reference_rate = models.DecimalField(null=True, blank=True, **RATE)

    received_bdt = models.DecimalField(**MONEY)  # what finally reached your account
    bank_charge_bdt = models.DecimalField(default=0, **MONEY)
    vat_bdt = models.DecimalField(default=0, **MONEY)
    tax_withheld_bdt = models.DecimalField(default=0, **MONEY)  # source tax held back
    other_charge_bdt = models.DecimalField(default=0, **MONEY)

    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-settled_on", "-id"]

    def __str__(self) -> str:
        return f"{self.settled_on} {self.earned_usd} USD -> {self.received_bdt} BDT"

    # --- everything below is calculated, never typed ---------------------------------------
    @property
    def converted_usd(self) -> Decimal:
        """Dollars that were actually sold."""
        return self.earned_usd - self.marketplace_fee_usd - self.transfer_fee_usd

    @property
    def deductions_bdt(self) -> Decimal:
        return self.bank_charge_bdt + self.vat_bdt + self.tax_withheld_bdt + self.other_charge_bdt

    @property
    def before_deductions_bdt(self) -> Decimal:
        """Taka the sale produced, before the bank's charges, VAT and tax."""
        return self.received_bdt + self.deductions_bdt

    @property
    def effective_rate(self) -> Decimal:
        """Taka per dollar the sale really fetched (the bank's rate, spread included)."""
        return (self.before_deductions_bdt / self.converted_usd).quantize(
            ONE_PAISA_RATE, rounding=ROUND_HALF_UP
        )

    @property
    def keep_per_dollar(self) -> Decimal:
        """Taka that reached you for each dollar you earned."""
        return (self.received_bdt / self.earned_usd).quantize(
            ONE_PAISA_RATE, rounding=ROUND_HALF_UP
        )

    def waterfall(self) -> dict | None:
        """Where each part of the earned dollars went, in taka at the reference rate.

        value - marketplace fee - transfer fee - rate difference - bank charge - VAT - tax
        - other = received. The rate difference is the bank rate against your reference
        (negative if you got more than the reference).
        """
        if not self.reference_rate:
            return None
        ref = self.reference_rate

        def cents(v):
            return v.quantize(ONE_CENT, rounding=ROUND_HALF_UP)

        value = cents(self.earned_usd * ref)
        marketplace = cents(self.marketplace_fee_usd * ref)
        transfer = cents(self.transfer_fee_usd * ref)
        # The rate difference is what is left over, so the rows always add up to the cent.
        rate_difference = value - marketplace - transfer - self.deductions_bdt - self.received_bdt
        return {
            "value_at_reference_rate": value,
            "marketplace_fee": marketplace,
            "transfer_fee": transfer,
            "rate_difference": rate_difference,
            "bank_charge": self.bank_charge_bdt,
            "vat": self.vat_bdt,
            "tax_withheld": self.tax_withheld_bdt,
            "other": self.other_charge_bdt,
            "received": self.received_bdt,
        }

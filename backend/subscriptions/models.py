from django.conf import settings
from django.db import models

from billing.models import MONEY, Currency


class Subscription(models.Model):
    class Cycle(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        CANCELLED = "cancelled", "Cancelled"

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    project = models.ForeignKey("projects.Project", on_delete=models.PROTECT, related_name="+")
    title = models.CharField(max_length=220)
    unit_price = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.BDT)
    cycle = models.CharField(max_length=10, choices=Cycle.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    start_date = models.DateField()
    next_billing_date = models.DateField()
    order = models.OneToOneField(
        "catalog.Order",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="subscription",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class Charge(models.Model):
    """One billed period. The unique pair is what makes billing safe to run twice."""

    subscription = models.ForeignKey(Subscription, on_delete=models.PROTECT, related_name="charges")
    period_start = models.DateField()
    invoice = models.OneToOneField("billing.Invoice", on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["period_start"]
        constraints = [
            models.UniqueConstraint(
                fields=["subscription", "period_start"], name="uniq_charge_period"
            )
        ]

    def __str__(self) -> str:
        return f"{self.subscription_id} {self.period_start}"

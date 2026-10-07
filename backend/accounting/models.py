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

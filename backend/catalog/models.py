import uuid

from django.conf import settings
from django.db import models

from billing.models import MONEY, Currency, Cycle


class Service(models.Model):
    """A kind of work I offer (web development, hosting, ...). Packages hang under it."""

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=120)
    summary = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)
    published = models.BooleanField(default=False)

    class Meta:
        ordering = ["position", "title"]

    def __str__(self) -> str:
        return self.title


class Package(models.Model):
    """A fixed offer with a fixed price (Basic, Standard, Premium), like a Fiverr gig tier."""

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="packages")
    name = models.CharField(max_length=80)
    tagline = models.CharField(max_length=200, blank=True)
    features = models.JSONField(default=list, blank=True)  # list of short strings
    price = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.BDT)
    cycle = models.CharField(max_length=10, choices=Cycle.choices, default=Cycle.ONE_TIME)
    delivery_days = models.PositiveIntegerField(null=True, blank=True)
    revisions = models.PositiveIntegerField(null=True, blank=True)
    position = models.PositiveIntegerField(default=0)
    published = models.BooleanField(default=False)

    class Meta:
        ordering = ["position", "price"]

    def __str__(self) -> str:
        return f"{self.service.title} - {self.name}"


class Order(models.Model):
    """A client asking for a package. The price is copied here so later edits never change it."""

    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    package = models.ForeignKey(Package, on_delete=models.PROTECT, related_name="orders")
    title = models.CharField(max_length=220)
    unit_price = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, choices=Currency.choices)
    cycle = models.CharField(max_length=10, choices=Cycle.choices)
    note = models.TextField(max_length=2000, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.REQUESTED)
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title

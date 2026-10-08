import uuid

from django.db import models


class Lead(models.Model):
    """A project enquiry submitted through the public contact form."""

    class Need(models.TextChoices):
        ECOMMERCE = "ecommerce", "Online store (eCommerce)"
        BUSINESS_APP = "business_app", "Business management app"
        ADMIN_DASHBOARD = "admin_dashboard", "Admin dashboard"
        BACKEND_API = "backend_api", "Backend API or integration"
        IMPROVE_EXISTING = "improve_existing", "Improve an existing app"
        OTHER = "other", "Something else"

    class Budget(models.TextChoices):
        UNSURE = "unsure", "Not sure yet"
        UNDER_500 = "under_500", "Under $500"
        B500_1500 = "500_1500", "$500 - $1,500"
        B1500_5000 = "1500_5000", "$1,500 - $5,000"
        OVER_5000 = "over_5000", "$5,000+"

    class Timeline(models.TextChoices):
        FLEXIBLE = "flexible", "Flexible"
        WITHIN_1M = "within_1m", "Within 1 month"
        ONE_TO_3M = "1_3m", "1 - 3 months"
        OVER_3M = "over_3m", "3+ months"

    class Status(models.TextChoices):
        NEW = "new", "New"
        READ = "read", "Read"
        REPLIED = "replied", "Replied"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    email = models.EmailField()
    need = models.CharField(max_length=32, choices=Need.choices)
    details = models.TextField(max_length=5000)
    budget = models.CharField(max_length=16, choices=Budget.choices, blank=True)
    timeline = models.CharField(max_length=16, choices=Timeline.choices, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    # Keyed hash of the sender IP: lets me spot repeat abuse without storing the address.
    ip_hash = models.CharField(max_length=64, blank=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    notify_error = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} <{self.email}> ({self.get_need_display()})"


class LeadReply(models.Model):
    """An answer sent from the admin dashboard. Kept so the thread is visible next to the enquiry."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="replies")
    subject = models.CharField(max_length=200)
    body = models.TextField(max_length=10000)
    sent_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    sent_at = models.DateTimeField(null=True, blank=True)
    error = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Reply to {self.lead.email}: {self.subject}"

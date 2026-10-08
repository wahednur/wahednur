import uuid

from django.conf import settings
from django.db import models


class ClientProfile(models.Model):
    """Business details for a client account. `internal_notes` is never shown to the client."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="client_profile"
    )

    class Type(models.TextChoices):
        LOCAL = "local", "Local (Bangladesh)"
        FOREIGN = "foreign", "Foreign"

    # Decides the currency of every quotation and invoice: local = BDT, foreign = USD.
    client_type = models.CharField(max_length=7, choices=Type.choices, default=Type.LOCAL)
    full_name = models.CharField(max_length=150, blank=True)
    company = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=300, blank=True)
    internal_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.company or self.full_name or self.user.email

    @property
    def currency(self) -> str:
        return "USD" if self.client_type == self.Type.FOREIGN else "BDT"


class Project(models.Model):
    class Status(models.TextChoices):
        PROPOSAL = "proposal", "Proposal"
        ACTIVE = "active", "In progress"
        ON_HOLD = "on_hold", "On hold"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="projects"
    )
    title = models.CharField(max_length=200)
    summary = models.TextField(max_length=3000, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PROPOSAL)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    # Holds a customer's shop invoices. Never shown in project lists.
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title

    @property
    def progress(self) -> int:
        """Percent of milestones done. Derived, so it can never disagree with the milestones."""
        total = self.milestones.count()
        if not total:
            return 100 if self.status == self.Status.COMPLETED else 0
        return round(100 * self.milestones.filter(status=Milestone.Status.DONE).count() / total)


class Milestone(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In progress"
        DONE = "done", "Done"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=200)
    description = models.TextField(max_length=2000, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.TODO)
    position = models.PositiveIntegerField(default=0)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return self.title


class ProjectUpdate(models.Model):
    """A dated progress note. Internal notes (`is_public=False`) are hidden from the client."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="updates")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    message = models.TextField(max_length=3000)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.message[:60]

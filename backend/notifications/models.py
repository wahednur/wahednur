from django.conf import settings
from django.db import models


class Notification(models.Model):
    """One line in a person's notification list: what happened, and where to see it."""

    class Kind(models.TextChoices):
        UPDATE = "update", "Progress update"
        MILESTONE = "milestone", "Milestone"
        REPORT = "report", "Daily report"
        QUOTATION = "quotation", "Quotation"
        INVOICE = "invoice", "Invoice"
        PAYMENT = "payment", "Payment"
        MESSAGE = "message", "Message"
        SYSTEM = "system", "System"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.SYSTEM)
    title = models.CharField(max_length=160)
    body = models.CharField(max_length=400, blank=True)
    url = models.CharField(max_length=200, blank=True)  # a path inside the site, like /app/projects/<id>
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "read_at"])]

    def __str__(self) -> str:
        return f"{self.user_id}: {self.title}"


class NotificationSetting(models.Model):
    """What a person wants to be told about, and how. Defaults: everything on."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_setting")
    email = models.BooleanField(default=True)  # emails for reports, messages and updates
    push = models.BooleanField(default=True)  # browser push, once a device has subscribed


class PushSubscription(models.Model):
    """A browser or phone that agreed to receive push notifications."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.TextField(unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    user_agent = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Message(models.Model):
    """A private conversation between one customer and me. One thread per customer."""

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversation")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    from_team = models.BooleanField(default=False)
    body = models.TextField(max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["customer", "created_at"])]

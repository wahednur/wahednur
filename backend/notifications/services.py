"""Create notifications, and optionally push and email them. Other apps call `notify`; nothing
here is ever allowed to break the action that triggered it."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import Message, Notification, NotificationSetting

logger = logging.getLogger(__name__)


def settings_for(user) -> NotificationSetting:
    return NotificationSetting.objects.get_or_create(user=user)[0]


def notify(user, *, kind: str, title: str, body: str = "", url: str = "", email: bool = False) -> Notification | None:
    """Add to the person's list, push to their devices, and (if asked and allowed) email them."""
    try:
        n = Notification.objects.create(user=user, kind=kind, title=title[:160], body=body[:400], url=url[:200])
        _after_commit(lambda: _push(n.pk))
        if email and settings_for(user).email and user.email:
            _after_commit(lambda: _email(user.email, title, body, url))
        return n
    except Exception:  # noqa: BLE001
        logger.exception("Could not create a notification for user %s", getattr(user, "pk", None))
        return None


def notify_staff(*, kind: str, title: str, body: str = "", url: str = "") -> None:
    from django.contrib.auth import get_user_model

    for staff in get_user_model().objects.filter(is_staff=True, is_active=True):
        notify(staff, kind=kind, title=title, body=body, url=url)


def _after_commit(fn) -> None:
    transaction.on_commit(fn)


def _push(notification_id: int) -> None:
    from . import push
    from .tasks import push_notification

    if not push.enabled():
        return
    try:
        push_notification.delay(notification_id)
    except Exception:  # noqa: BLE001  (no worker or broker: send it now instead)
        try:
            push_notification(notification_id)
        except Exception:  # noqa: BLE001
            logger.exception("Push for notification %s failed", notification_id)


def _email(to: str, title: str, body: str, url: str) -> None:
    link = f"\n\nOpen it: {settings.FRONTEND_URL}{url}" if url else ""
    try:
        send_mail(title, f"{body}{link}\n\n{settings.BUSINESS_NAME}", settings.DEFAULT_FROM_EMAIL, [to], fail_silently=True)
    except Exception:  # noqa: BLE001
        logger.exception("Notification email to %s failed", to)


def unread_count(user) -> int:
    return Notification.objects.filter(user=user, read_at__isnull=True).count()


def mark_read(user, ids=None) -> int:
    qs = Notification.objects.filter(user=user, read_at__isnull=True)
    if ids is not None:
        qs = qs.filter(pk__in=ids)
    return qs.update(read_at=timezone.now())


# --- conversation ---------------------------------------------------------------------
def post_message(*, customer, sender, body: str) -> Message:
    """A message from the customer to me, or from the team to the customer."""
    from_team = sender.is_staff and sender.pk != customer.pk
    msg = Message.objects.create(customer=customer, sender=sender, from_team=from_team, body=body.strip())
    preview = msg.body[:140]
    if from_team:
        notify(customer, kind="message", title="New message from Wahed Nur", body=preview, url="/app/messages", email=True)
    else:
        who = customer.full_name or customer.email
        notify_staff(kind="message", title=f"New message from {who}", body=preview, url=f"/messages/{customer.pk}")
    return msg


def mark_thread_read(*, customer, reader) -> int:
    """The reader opened the thread: mark what the other side wrote as read."""
    team_reads = reader.is_staff and reader.pk != customer.pk
    qs = Message.objects.filter(customer=customer, read_at__isnull=True, from_team=not team_reads)
    return qs.update(read_at=timezone.now())

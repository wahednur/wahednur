"""Web push. Needs VAPID keys in the environment; without them push is simply switched off."""

import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def enabled() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def send_to_user(user, payload: dict) -> int:
    """Send to every device the person subscribed. Dead subscriptions (gone, 404/410) are removed.
    Returns how many were delivered. Never raises: a push problem must not break the action."""
    if not enabled():
        return 0
    from pywebpush import WebPushException, webpush

    from .models import PushSubscription

    sent = 0
    for sub in PushSubscription.objects.filter(user=user):
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_SUBJECT},
                ttl=86400,
            )
            sent += 1
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):
                sub.delete()
            else:
                logger.warning("Push to subscription %s failed: %s", sub.pk, str(exc)[:200])
        except Exception:  # noqa: BLE001
            logger.exception("Push to subscription %s failed", sub.pk)
    return sent

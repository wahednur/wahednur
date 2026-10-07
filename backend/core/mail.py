"""Django email backend that sends through Resend in the background (Celery).
Used by django-allauth for verification codes and password resets."""

import uuid

from django.core.mail.backends.base import BaseEmailBackend

from .tasks import send_email


def build_payload(message) -> dict:
    html = next((c for c, mime in getattr(message, "alternatives", []) if mime == "text/html"), "")
    payload = {
        "from": message.from_email,
        "to": list(message.to),
        "subject": message.subject,
        "text": message.body,
        "idempotency_key": f"mail-{uuid.uuid4()}",  # a retried task never sends twice
    }
    if html:
        payload["html"] = html
    if message.reply_to:
        payload["reply_to"] = list(message.reply_to)
    return payload


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        count = 0
        for message in email_messages:
            if not message.to:
                continue
            send_email.delay(build_payload(message))
            count += 1
        return count

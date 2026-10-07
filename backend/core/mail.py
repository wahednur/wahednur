"""Django email backend that sends through Resend. Used by django-allauth for verification codes
and password resets.

The email is sent straight away, so a sign-in code arrives even if the background worker is down.
Only when Resend is unreachable or has a temporary problem is the same email (same idempotency key,
so it can never be sent twice) handed to the worker to retry. If Resend refuses it (for example an
unverified domain) that is logged with Resend's reason and the request is not broken.
"""

import logging
import uuid

from django.core.mail.backends.base import BaseEmailBackend

from .tasks import MailError, MailRejected, send_email

logger = logging.getLogger(__name__)


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
            payload = build_payload(message)
            try:
                send_email.run(payload)
            except MailError:
                send_email.delay(payload)  # temporary trouble: the worker keeps trying
            except MailRejected:
                logger.error("Email %r to %s was refused by Resend", message.subject, message.to)
                continue
            count += 1
        return count

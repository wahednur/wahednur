"""Thin Resend client. Kept separate so the rest of the app never touches HTTP."""

import html
import logging

import httpx
from django.conf import settings

from .models import Lead

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


class EmailError(Exception):
    """Raised when the email could not be handed to Resend."""


def build_message(lead: Lead) -> tuple[str, str, str]:
    """Return (subject, text, html). The subject only uses a fixed choice label,
    never free text, and every user-supplied value is escaped in the HTML."""
    subject = f"New enquiry: {lead.get_need_display()}"
    rows = [
        ("Name", lead.name),
        ("Email", lead.email),
        ("Need", lead.get_need_display()),
        ("Budget", lead.get_budget_display() if lead.budget else "-"),
        ("Timeline", lead.get_timeline_display() if lead.timeline else "-"),
    ]
    text = "\n".join(f"{k}: {v}" for k, v in rows) + f"\n\n{lead.details}\n"
    body = "".join(f"<p><strong>{html.escape(k)}:</strong> {html.escape(v)}</p>" for k, v in rows)
    details = html.escape(lead.details).replace("\n", "<br>")
    return subject, text, f"{body}<hr><p>{details}</p>"


def _send_by_smtp(lead: Lead, subject: str, text: str, body_html: str) -> None:
    from django.core.mail import EmailMultiAlternatives, get_connection

    message = EmailMultiAlternatives(
        subject,
        text,
        settings.DEFAULT_FROM_EMAIL,
        [settings.LEADS_NOTIFY_TO],
        reply_to=[lead.email],
        # A plain connection (not the "safe" backend) so a failure reaches the retry logic.
        connection=get_connection("django.core.mail.backends.smtp.EmailBackend"),
    )
    message.attach_alternative(body_html, "text/html")
    try:
        message.send(fail_silently=False)
    except Exception as exc:  # noqa: BLE001
        raise EmailError(f"SMTP send failed: {exc.__class__.__name__}: {str(exc)[:180]}") from exc


def send_lead_email(lead: Lead) -> None:
    subject, text, body_html = build_message(lead)

    if settings.EMAIL_USE_SMTP:
        _send_by_smtp(lead, subject, text, body_html)
        return

    if not settings.RESEND_API_KEY:
        # Local development: no key, so show the message instead of sending it.
        logger.info("Resend not configured. Would send: %s\n%s", subject, text)
        return

    payload = {
        "from": settings.LEADS_FROM_EMAIL,
        "to": [settings.LEADS_NOTIFY_TO],
        "subject": subject,
        "text": text,
        "html": body_html,
        "reply_to": lead.email,  # so replying goes straight to the enquirer
    }
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        # A retried task must not send the same notification twice.
        "Idempotency-Key": f"lead-{lead.id}",
    }
    try:
        response = httpx.post(RESEND_URL, json=payload, headers=headers, timeout=10.0)
    except httpx.HTTPError as exc:
        raise EmailError(f"Resend request failed: {exc.__class__.__name__}") from exc
    if response.status_code >= 300:
        raise EmailError(f"Resend returned HTTP {response.status_code}")


def send_reply_email(*, to: str, subject: str, body: str) -> None:
    """Send the owner's answer to an enquirer. Replies to it come back to the owner's inbox."""
    if settings.EMAIL_USE_SMTP:
        from django.core.mail import EmailMessage, get_connection

        message = EmailMessage(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [to],
            reply_to=[settings.LEADS_NOTIFY_TO],
            connection=get_connection("django.core.mail.backends.smtp.EmailBackend"),
        )
        try:
            message.send(fail_silently=False)
        except Exception as exc:  # noqa: BLE001
            raise EmailError(f"SMTP send failed: {exc.__class__.__name__}: {str(exc)[:180]}") from exc
        return

    if not settings.RESEND_API_KEY:
        logger.info("Email not configured. Would send reply to %s: %s\n%s", to, subject, body)
        return

    payload = {
        "from": settings.LEADS_FROM_EMAIL,
        "to": [to],
        "subject": subject,
        "text": body,
        "reply_to": settings.LEADS_NOTIFY_TO,
    }
    headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}"}
    try:
        response = httpx.post(RESEND_URL, json=payload, headers=headers, timeout=10.0)
    except httpx.HTTPError as exc:
        raise EmailError(f"Resend request failed: {exc.__class__.__name__}") from exc
    if response.status_code >= 300:
        raise EmailError(f"Resend returned HTTP {response.status_code}")

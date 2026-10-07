import logging

import httpx
from celery import shared_task
from django.conf import settings

RESEND_URL = "https://api.resend.com/emails"


logger = logging.getLogger(__name__)


class MailError(Exception):
    """Resend could not be reached or had a temporary problem: worth trying again."""


class MailRejected(Exception):
    """Resend refused the email (bad sender, unverified domain): retrying cannot help."""


@shared_task
def ping() -> str:
    """Smoke-test task: confirms a worker is consuming the queue."""
    return "pong"


@shared_task(
    autoretry_for=(MailError,),
    retry_backoff=True,
    retry_backoff_max=900,
    max_retries=5,
)
def send_email(payload: dict) -> None:
    payload = dict(payload)
    key = payload.pop("idempotency_key", None)
    headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}"}
    if key:
        headers["Idempotency-Key"] = key
    try:
        response = httpx.post(RESEND_URL, json=payload, headers=headers, timeout=10.0)
    except httpx.HTTPError as exc:
        raise MailError(f"Resend request failed: {exc.__class__.__name__}") from exc
    if response.status_code < 300:
        return
    # Resend explains itself in the body (for example "The domain is not verified"). Keep that
    # text in the log: it is the fastest way to find out why a code never arrived.
    detail = response.text[:300].replace("\n", " ")
    message = f"Resend returned HTTP {response.status_code}: {detail}"
    if response.status_code in (408, 429) or response.status_code >= 500:
        raise MailError(message)
    logger.error("Email to %s was refused. %s", payload.get("to"), message)
    raise MailRejected(message)

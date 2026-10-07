import httpx
from celery import shared_task
from django.conf import settings

RESEND_URL = "https://api.resend.com/emails"


class MailError(Exception):
    """The email could not be handed to Resend."""


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
    if response.status_code >= 300:
        raise MailError(f"Resend returned HTTP {response.status_code}")

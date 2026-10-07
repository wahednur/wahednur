import httpx
from celery import shared_task
from django.conf import settings

from . import services


class RevalidateError(Exception):
    """The website did not accept the refresh request."""


@shared_task
def generate_seo(page_id: int) -> bool:
    return services.generate_seo(page_id)


@shared_task(
    autoretry_for=(RevalidateError,), retry_backoff=True, retry_backoff_max=600, max_retries=5
)
def revalidate_frontend(paths: list[str]) -> None:
    """Tell the website to rebuild these pages now instead of waiting for the cache to expire."""
    if not settings.REVALIDATE_SECRET:
        return
    try:
        r = httpx.post(
            f"{settings.FRONTEND_URL}/api/revalidate",
            headers={"x-revalidate-secret": settings.REVALIDATE_SECRET},
            json={"paths": paths},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise RevalidateError(exc.__class__.__name__) from exc
    if r.status_code >= 300:
        raise RevalidateError(f"HTTP {r.status_code}")

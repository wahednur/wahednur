"""Content rules. Changing published content regenerates its SEO text and refreshes the website."""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record

from . import seo
from .models import Page


def published():
    return Page.objects.filter(status=Page.Status.PUBLISHED, deleted_at__isnull=True)


def manageable():
    return Page.objects.filter(deleted_at__isnull=True)


def get_published(slug) -> Page:
    try:
        return published().get(slug=slug)
    except Page.DoesNotExist:
        raise NotFound() from None


def get_manageable(pk) -> Page:
    try:
        return manageable().get(pk=pk)
    except (Page.DoesNotExist, ValueError):
        raise NotFound() from None


def paths_for(page: Page) -> list[str]:
    """The website pages that show this content."""
    if page.kind == Page.Kind.POST:
        return ["/blog", f"/blog/{page.slug}", "/sitemap.xml"]
    return ["/", f"/{page.slug}", "/sitemap.xml"]


def _refresh(page: Page, *, seo_needed: bool):
    """After commit: regenerate SEO if the content changed, then refresh the website pages."""
    from .tasks import generate_seo, revalidate_frontend

    def run():
        if seo_needed:
            generate_seo.delay(page.pk)  # the task refreshes pages itself once SEO is saved
        else:
            revalidate_frontend.delay(paths_for(page))

    transaction.on_commit(run)


@transaction.atomic
def save_page(*, user, page: Page | None = None, request=None, **data) -> Page:
    creating = page is None
    page = page or Page(author=user)
    old_slug = None if creating else page.slug
    for field, value in data.items():
        setattr(page, field, value)
    if page.status == Page.Status.PUBLISHED and page.published_at is None:
        page.published_at = timezone.now()
    page.save()
    live = page.status == Page.Status.PUBLISHED
    if live:
        _refresh(page, seo_needed=(not page.seo_locked and page.seo_stale))
    if old_slug and old_slug != page.slug and live:
        from .tasks import revalidate_frontend

        old = Page(kind=page.kind, slug=old_slug)
        transaction.on_commit(lambda: revalidate_frontend.delay(paths_for(old)))
    record("page_saved", request=request, user=user)
    return page


def generate_seo(page_id: int) -> bool:
    """Runs in the worker. Writes the result only if the content did not change meanwhile."""
    page = manageable().filter(pk=page_id).first()
    if page is None or page.status != Page.Status.PUBLISHED or page.seo_locked:
        return False
    wanted = page.content_hash
    result = seo.generate(page.title, page.excerpt, page.body)  # slow: outside any lock
    with transaction.atomic():
        page = Page.objects.select_for_update().get(pk=page_id)
        if page.content_hash != wanted or page.seo_locked or page.deleted_at:
            return False  # edited again while generating: the newer edit queued its own run
        page.seo_title = result["title"]
        page.seo_description = result["description"]
        page.seo_source = result["source"]
        page.seo_hash = wanted
        page.seo_generated_at = timezone.now()
        page.save(
            update_fields=[
                "seo_title",
                "seo_description",
                "seo_source",
                "seo_hash",
                "seo_generated_at",
            ]
        )
    from .tasks import revalidate_frontend

    revalidate_frontend.delay(paths_for(page))
    return True


@transaction.atomic
def set_seo_by_hand(*, page: Page, title: str, description: str, user, request=None) -> Page:
    if not title.strip() or not description.strip():
        raise ValidationError({"detail": "Write both a title and a description."})
    page.seo_title, page.seo_description = title.strip(), description.strip()
    page.seo_source = Page.SeoSource.MANUAL
    page.seo_locked = True
    page.seo_hash = page.content_hash
    page.seo_generated_at = timezone.now()
    page.save()
    if page.status == Page.Status.PUBLISHED:
        _refresh(page, seo_needed=False)
    record("seo_manual", request=request, user=user)
    return page


@transaction.atomic
def unlock_seo(*, page: Page, user, request=None) -> Page:
    """Hand the SEO text back to the generator."""
    page.seo_locked = False
    page.seo_hash = ""  # force regeneration
    page.save(update_fields=["seo_locked", "seo_hash"])
    if page.status == Page.Status.PUBLISHED:
        _refresh(page, seo_needed=True)
    record("seo_unlocked", request=request, user=user)
    return page


@transaction.atomic
def delete_page(*, page: Page, user, request=None):
    was_live = page.status == Page.Status.PUBLISHED
    page.deleted_at = timezone.now()
    page.save(update_fields=["deleted_at"])
    if was_live:
        _refresh(page, seo_needed=False)
    record("page_deleted", request=request, user=user)

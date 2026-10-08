"""Load blog posts from Markdown files.

    python manage.py load_posts content/posts            # preview only: nothing is saved
    python manage.py load_posts content/posts --apply    # save as DRAFTS
    python manage.py load_posts content/posts --apply --publish

Each file starts with a small header between --- lines (slug, title, excerpt), then the post body.
Matched by slug, so running it again updates instead of duplicating. Posts are drafts unless
--publish is given, so nothing goes live before you have read it.
"""

from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from cms import services
from cms.models import Page


def parse(text: str) -> dict:
    if not text.startswith("---\n"):
        raise ValueError("missing header")
    head, _, body = text[4:].partition("\n---\n")
    meta = {}
    for line in head.splitlines():
        key, sep, value = line.partition(":")
        if not sep:
            raise ValueError(f"bad header line: {line!r}")
        meta[key.strip()] = value.strip()
    for key in ("slug", "title"):
        if not meta.get(key):
            raise ValueError(f"header needs {key}")
    return {
        "slug": meta["slug"],
        "title": meta["title"],
        "excerpt": meta.get("excerpt", ""),
        "body": body.strip() + "\n",
    }


class Rollback(Exception):
    pass


class Command(BaseCommand):
    help = "Load blog posts from Markdown files (preview by default)."

    def add_arguments(self, parser):
        parser.add_argument("folder")
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--publish", action="store_true")

    def handle(self, *args, folder, apply, publish, **opts):
        files = sorted(Path(folder).glob("*.md"))
        if not files:
            raise CommandError(f"No .md files in {folder}")
        owner = get_user_model().objects.filter(is_superuser=True).order_by("pk").first()
        if owner is None:
            raise CommandError("Create the owner account first (bootstrap_owner).")
        try:
            with transaction.atomic():
                for f in files:
                    try:
                        data = parse(f.read_text(encoding="utf-8"))
                    except ValueError as err:
                        raise CommandError(f"{f.name}: {err}") from err
                    page = Page.objects.filter(slug=data["slug"], deleted_at__isnull=True).first()
                    status = (
                        Page.Status.PUBLISHED
                        if publish
                        else (page.status if page else Page.Status.DRAFT)
                    )
                    services.save_page(
                        user=owner, page=page, kind=Page.Kind.POST, status=status, **data
                    )
                    self.stdout.write(
                        f"{'update' if page else 'create'}  {data['slug']}  [{status}]"
                    )
                if not apply:
                    raise Rollback
        except Rollback:
            self.stdout.write("Preview only. Nothing saved. Add --apply to save.")
            return
        self.stdout.write(self.style.SUCCESS(f"Saved {len(files)} posts."))

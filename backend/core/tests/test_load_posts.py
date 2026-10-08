from io import StringIO
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

from cms.models import Page

pytestmark = pytest.mark.django_db

POST = "---\nslug: a-post\ntitle: A post\nexcerpt: Short.\n---\nBody text.\n"


@pytest.fixture
def owner():
    return get_user_model().objects.create_superuser("o@example.com", "Str0ng-pass-123!")


def run(folder, **kw):
    out = StringIO()
    call_command("load_posts", str(folder), stdout=out, **kw)
    return out.getvalue()


def test_preview_saves_nothing(tmp_path, owner):
    (tmp_path / "a.md").write_text(POST, encoding="utf-8")
    assert "Preview only" in run(tmp_path)
    assert Page.objects.count() == 0


def test_apply_makes_drafts_and_is_repeatable(tmp_path, owner):
    (tmp_path / "a.md").write_text(POST, encoding="utf-8")
    run(tmp_path, apply=True)
    run(tmp_path, apply=True)
    page = Page.objects.get()
    assert (
        page.status == Page.Status.DRAFT and page.title == "A post" and page.body == "Body text.\n"
    )


def test_publish_flag_publishes(tmp_path, owner):
    (tmp_path / "a.md").write_text(POST, encoding="utf-8")
    run(tmp_path, apply=True, publish=True)
    assert Page.objects.get().status == Page.Status.PUBLISHED


def test_bad_header_is_refused(tmp_path, owner):
    (tmp_path / "a.md").write_text("no header", encoding="utf-8")
    with pytest.raises(CommandError):
        run(tmp_path, apply=True)


def test_shipped_posts_all_parse(owner):
    folder = Path(__file__).resolve().parents[2] / "content" / "posts"
    assert "Preview only" in run(folder)


def test_publish_reports_published_count_and_missing_secret(tmp_path, owner, settings):
    settings.REVALIDATE_SECRET = ""
    (tmp_path / "a.md").write_text(POST, encoding="utf-8")
    out = run(tmp_path, apply=True, publish=True)
    assert "Published posts now: 1" in out and "REVALIDATE_SECRET is not set" in out


def test_draft_load_says_nothing_is_public(tmp_path, owner):
    (tmp_path / "a.md").write_text(POST, encoding="utf-8")
    assert "Nothing is public yet" in run(tmp_path, apply=True)

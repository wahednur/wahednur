import json

import httpx
import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from cms import seo, services, tasks
from cms.models import Page

User = get_user_model()
pytestmark = pytest.mark.django_db
PW = "a-very-long-pass-123"
BODY = "# Hello\n\nI build **web apps** for small shops. This post explains how. " * 3


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.REQUIRE_STAFF_MFA = False
    settings.AI_PROVIDERS = []
    settings.REVALIDATE_SECRET = ""


def make_user(email, **extra):
    user = User.objects.create_user(email, PW, **extra)
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    return user


def login(user):
    api = APIClient()
    api.force_login(user)
    return api


@pytest.fixture
def staff():
    return make_user("staff@example.com", is_staff=True)


@pytest.fixture
def calls(monkeypatch):
    """Records website refresh requests instead of sending them."""
    sent = []
    monkeypatch.setattr(tasks.revalidate_frontend, "delay", lambda paths: sent.append(paths))
    return sent


def save(staff, capture, **data):
    body = {
        "kind": "post",
        "slug": "first",
        "title": "My first post",
        "body": BODY,
        "status": "published",
        **data,
    }
    with capture(execute=True):
        return services.save_page(user=staff, **body)


# --- rule-based text -----------------------------------------------------------------
def test_plain_text_and_cutting():
    assert (
        seo.plain_text("# Title\n\n**Bold** and [a link](http://x.y) `code`")
        == "Title Bold and a link code"
    )
    assert seo._cut("one two three four", 12) == "one two…"
    assert len(seo._cut("word " * 100, 155)) <= 155


def test_rule_based_never_exceeds_limits():
    r = seo.rule_based("T" * 200, "", "word " * 500)
    assert len(r["title"]) <= seo.TITLE_MAX and len(r["description"]) <= seo.DESC_MAX


# --- automatic SEO on publish and change ------------------------------------------------
def test_publishing_generates_seo_and_refreshes_the_site(
    staff, calls, django_capture_on_commit_callbacks
):
    page = save(staff, django_capture_on_commit_callbacks)
    page.refresh_from_db()
    assert page.seo_title == "My first post" and page.seo_source == "rule"
    assert page.seo_description.startswith("Hello") and page.seo_hash == page.content_hash
    assert page.published_at is not None
    assert calls and "/blog/first" in calls[-1] and "/sitemap.xml" in calls[-1]


def test_drafts_get_no_seo_and_no_refresh(staff, calls, django_capture_on_commit_callbacks):
    page = save(staff, django_capture_on_commit_callbacks, status="draft")
    page.refresh_from_db()
    assert page.seo_source == "none" and page.seo_title == "" and calls == []


def test_changing_the_content_regenerates_but_a_no_op_save_does_not(
    staff, calls, django_capture_on_commit_callbacks, monkeypatch
):
    page = save(staff, django_capture_on_commit_callbacks)
    runs = []
    real = seo.generate
    monkeypatch.setattr(seo, "generate", lambda *a: runs.append(1) or real(*a))
    save_again = dict(
        kind="post", slug="first", title="My first post", body=BODY, status="published"
    )
    with django_capture_on_commit_callbacks(execute=True):
        services.save_page(user=staff, page=Page.objects.get(pk=page.pk), **save_again)
    assert runs == []  # same words: nothing to regenerate (saves cost and time)
    with django_capture_on_commit_callbacks(execute=True):
        services.save_page(
            user=staff, page=Page.objects.get(pk=page.pk), **{**save_again, "title": "A new title"}
        )
    assert runs == [1]
    assert Page.objects.get(pk=page.pk).seo_title == "A new title"


def test_hand_written_seo_is_never_overwritten_until_unlocked(
    staff, calls, django_capture_on_commit_callbacks
):
    page = save(staff, django_capture_on_commit_callbacks)
    with django_capture_on_commit_callbacks(execute=True):
        services.set_seo_by_hand(page=page, title="My title", description="My words", user=staff)
    page.refresh_from_db()
    assert page.seo_locked and page.seo_source == "manual"
    with django_capture_on_commit_callbacks(execute=True):
        services.save_page(
            user=staff,
            page=page,
            kind="post",
            slug="first",
            title="Changed",
            body="New body",
            status="published",
        )
    page.refresh_from_db()
    assert page.seo_title == "My title"  # untouched
    with django_capture_on_commit_callbacks(execute=True):
        services.unlock_seo(page=page, user=staff)
    page.refresh_from_db()
    assert page.seo_title == "Changed" and page.seo_source == "rule"


def test_a_slow_generation_cannot_overwrite_a_newer_edit(
    staff, calls, django_capture_on_commit_callbacks, monkeypatch
):
    page = save(staff, django_capture_on_commit_callbacks)

    def slow(title, excerpt, body):
        Page.objects.filter(pk=page.pk).update(body="edited meanwhile")  # someone edits
        return {"title": "OLD", "description": "OLD", "source": "rule"}

    monkeypatch.setattr(seo, "generate", slow)
    Page.objects.filter(pk=page.pk).update(seo_hash="")
    assert services.generate_seo(page.pk) is False
    assert Page.objects.get(pk=page.pk).seo_title != "OLD"


def test_deleted_page_is_hidden_and_refreshed(staff, calls, django_capture_on_commit_callbacks):
    page = save(staff, django_capture_on_commit_callbacks)
    calls.clear()
    with django_capture_on_commit_callbacks(execute=True):
        services.delete_page(page=page, user=staff)
    assert calls and not services.published().exists()
    assert Page.objects.count() == 1  # soft delete


def test_renaming_the_slug_refreshes_the_old_address_too(
    staff, calls, django_capture_on_commit_callbacks
):
    page = save(staff, django_capture_on_commit_callbacks)
    calls.clear()
    with django_capture_on_commit_callbacks(execute=True):
        services.save_page(
            user=staff,
            page=page,
            kind="post",
            slug="renamed",
            title=page.title,
            body=BODY,
            status="published",
        )
    assert any("/blog/first" in c for c in calls) and any("/blog/renamed" in c for c in calls)


# --- AI providers -------------------------------------------------------------------------
class FakeResponse:
    def __init__(self, payload, status=200):
        self.payload, self.status_code = payload, status

    def json(self):
        return self.payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("x", request=None, response=None)


def anthropic_reply(title, description):
    text = json.dumps({"title": title, "description": description})
    return FakeResponse({"content": [{"text": text}]})


def test_ai_text_is_used_when_it_is_grounded(settings, monkeypatch):
    settings.AI_PROVIDERS, settings.ANTHROPIC_API_KEY = ["anthropic"], "k"
    desc = "I build web apps for small shops and explain how in this short post."
    monkeypatch.setattr(
        httpx, "post", lambda *a, **k: anthropic_reply("Web apps for small shops", desc)
    )
    r = seo.generate("My first post", "", BODY)
    assert r["source"] == "ai" and r["title"] == "Web apps for small shops"


def test_ai_that_invents_a_number_is_rejected(settings, monkeypatch):
    settings.AI_PROVIDERS, settings.ANTHROPIC_API_KEY = ["anthropic"], "k"
    bad = "I build web apps for small shops and have served 500 happy customers since 2016."
    monkeypatch.setattr(httpx, "post", lambda *a, **k: anthropic_reply("Web apps", bad))
    assert seo.generate("My first post", "", BODY)["source"] == "rule"


@pytest.mark.parametrize(
    "reply",
    [
        FakeResponse({}, status=500),
        FakeResponse({"content": [{"text": "not json at all"}]}),
        FakeResponse({"content": [{"text": json.dumps({"title": "", "description": ""})}]}),
        FakeResponse({"content": [{"text": json.dumps({"title": "x" * 300, "description": "y"})}]}),
    ],
)
def test_broken_ai_answers_fall_back_to_rules(settings, monkeypatch, reply):
    settings.AI_PROVIDERS, settings.ANTHROPIC_API_KEY = ["anthropic"], "k"
    monkeypatch.setattr(httpx, "post", lambda *a, **k: reply)
    assert seo.generate("My first post", "", BODY)["source"] == "rule"


def test_network_failure_falls_back_and_next_provider_is_tried(settings, monkeypatch):
    settings.AI_PROVIDERS = ["anthropic", "groq"]
    settings.ANTHROPIC_API_KEY, settings.GROQ_API_KEY = "k", "k"
    good = {"title": "Web apps for shops", "description": "I build web apps for small shops."}

    def post(url, **kw):
        if "anthropic" in url:
            raise httpx.ConnectError("down")
        return FakeResponse({"choices": [{"message": {"content": json.dumps(good)}}]})

    monkeypatch.setattr(httpx, "post", post)
    assert seo.generate("My first post", "", BODY)["source"] == "ai"


def test_providers_without_keys_are_skipped(settings, monkeypatch):
    settings.AI_PROVIDERS, settings.ANTHROPIC_API_KEY = ["anthropic", "unknown"], ""
    monkeypatch.setattr(httpx, "post", lambda *a, **k: pytest.fail("must not be called"))
    assert seo.generate("T", "", BODY)["source"] == "rule"


def test_the_prompt_forbids_extra_facts_and_limits_size(settings, monkeypatch):
    settings.AI_PROVIDERS, settings.ANTHROPIC_API_KEY = ["anthropic"], "k"
    seen = {}

    def post(url, **kw):
        seen.update(kw)
        raise httpx.ConnectError("stop")

    monkeypatch.setattr(httpx, "post", post)
    seo.generate("T", "", "word " * 5000)
    prompt = seen["json"]["messages"][0]["content"]
    assert "Do not add numbers" in prompt and len(prompt) < seo.SOURCE_LIMIT + 1000


# --- website refresh -----------------------------------------------------------------------
def test_revalidate_sends_the_secret_and_paths(settings, monkeypatch):
    settings.REVALIDATE_SECRET = "s3cret"
    sent = {}

    def post(url, **kw):
        sent.update(url=url, **kw)
        return FakeResponse({})

    monkeypatch.setattr(httpx, "post", post)
    tasks.revalidate_frontend(["/blog"])
    assert sent["url"].endswith("/api/revalidate")
    assert sent["headers"]["x-revalidate-secret"] == "s3cret" and sent["json"] == {
        "paths": ["/blog"]
    }


def test_revalidate_does_nothing_without_a_secret(monkeypatch):
    monkeypatch.setattr(httpx, "post", lambda *a, **k: pytest.fail("must not be called"))
    tasks.revalidate_frontend(["/blog"])


def test_revalidate_failure_is_retryable(settings, monkeypatch):
    settings.REVALIDATE_SECRET = "s"
    monkeypatch.setattr(httpx, "post", lambda *a, **k: FakeResponse({}, status=502))
    with pytest.raises(tasks.RevalidateError):
        tasks.revalidate_frontend.run(["/blog"])


# --- API -----------------------------------------------------------------------------------
def test_public_api_shows_only_published_content(staff, calls, django_capture_on_commit_callbacks):
    save(staff, django_capture_on_commit_callbacks)
    save(staff, django_capture_on_commit_callbacks, slug="secret", status="draft", title="Draft")
    api = APIClient()
    rows = api.get("/api/cms/pages/").json()
    assert [r["slug"] for r in rows] == ["first"] and "body" not in rows[0]
    one = api.get("/api/cms/pages/first/").json()
    assert one["body"] == BODY and one["seo_title"] == "My first post"
    assert api.get("/api/cms/pages/secret/").status_code == 404
    assert api.get("/api/cms/pages/?kind=page").json() == []


def test_staff_api_flow_and_permissions(staff, calls, django_capture_on_commit_callbacks):
    client = make_user("client@example.com")
    body = {
        "kind": "post",
        "slug": "api-post",
        "title": "From the API",
        "body": BODY,
        "status": "draft",
    }
    assert login(client).post("/api/cms/manage/", body, format="json").status_code == 403
    assert APIClient().get("/api/cms/manage/").status_code in (401, 403)
    api = login(staff)
    with django_capture_on_commit_callbacks(execute=True):
        r = api.post("/api/cms/manage/", body, format="json")
    assert r.status_code == 201
    pid = r.json()["id"]
    with django_capture_on_commit_callbacks(execute=True):
        r = api.put(f"/api/cms/manage/{pid}/", {**body, "status": "published"}, format="json")
    assert r.json()["seo_stale"] is True  # the answer is built before the background job runs
    after = api.get(f"/api/cms/manage/{pid}/").json()  # the editor re-reads a moment later
    assert after["seo_title"] == "From the API" and after["seo_stale"] is False
    with django_capture_on_commit_callbacks(execute=True):
        r = api.post(
            f"/api/cms/manage/{pid}/seo/",
            {"title": "Mine", "description": "Mine too"},
            format="json",
        )
    assert r.json()["seo_locked"] is True and r.json()["seo_source"] == "manual"
    with django_capture_on_commit_callbacks(execute=True):
        r = api.post(f"/api/cms/manage/{pid}/seo/auto/")
    assert r.json()["seo_locked"] is False
    assert api.get(f"/api/cms/manage/{pid}/").json()["seo_source"] == "rule"
    assert api.delete(f"/api/cms/manage/{pid}/").status_code == 204
    assert api.get(f"/api/cms/manage/{pid}/").status_code == 404


def test_bad_input_is_rejected(staff):
    api = login(staff)
    assert (
        api.post("/api/cms/manage/", {"slug": "Bad Slug!", "title": "x"}, format="json").status_code
        == 400
    )
    ok = {"slug": "dup", "title": "x"}
    assert api.post("/api/cms/manage/", ok, format="json").status_code == 201
    assert api.post("/api/cms/manage/", ok, format="json").status_code == 400  # slug is unique
    pid = Page.objects.get().pk
    assert (
        api.post(
            f"/api/cms/manage/{pid}/seo/", {"title": "", "description": ""}, format="json"
        ).status_code
        == 400
    )

from unittest.mock import patch

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from notifications.models import Message, Notification, PushSubscription
from notifications import services as ns
from projects import services as ps
from projects.models import Milestone, Project

User = get_user_model()
pytestmark = pytest.mark.django_db


def mk(email, **kw):
    u = User.objects.create_user(email, "s3cret-pass-123", **kw)
    EmailAddress.objects.create(user=u, email=email, primary=True, verified=True)
    return u


def api(user):
    c = APIClient()
    c.force_login(user)
    return c


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.REQUIRE_STAFF_MFA = False


@pytest.fixture
def world(django_capture_on_commit_callbacks):
    staff = mk("staff@example.com", is_staff=True)
    client = mk("client@example.com", full_name="Rahim")
    project = Project.objects.create(client=client, title="Shop", status="active")
    return staff, client, project


def test_a_public_update_notifies_the_client_but_an_internal_note_does_not(world):
    staff, client, project = world
    ps.add_update(project=project, user=staff, message="Checkout is working", is_public=True)
    ps.add_update(project=project, user=staff, message="Client is slow to reply", is_public=False)
    notes = Notification.objects.filter(user=client)
    assert notes.count() == 1 and "Checkout" in notes[0].body
    assert notes[0].url == f"/app/projects/{project.pk}"


def test_finishing_a_milestone_notifies_once(world):
    staff, client, project = world
    m = Milestone.objects.create(project=project, title="Design")
    ps.edit_milestone(milestone=m, status="done")
    ps.edit_milestone(milestone=m, status="done")  # saving again must not repeat it
    assert Notification.objects.filter(user=client, kind="milestone").count() == 1


def test_publishing_a_report_notifies_and_emails_once(world, mailoutbox, django_capture_on_commit_callbacks):
    staff, client, project = world
    day = ps.timezone.localdate()
    report = ps.save_report(project=project, user=staff, day=day, summary="Cart done", items=["Built the cart", "Fixed a bug"])
    assert Notification.objects.filter(user=client).count() == 0  # a draft is private
    with django_capture_on_commit_callbacks(execute=True):
        ps.publish_report(report=report, user=staff)
        ps.publish_report(report=report, user=staff)
    assert Notification.objects.filter(user=client, kind="report").count() == 1
    assert len(mailoutbox) == 1 and "Cart done" in mailoutbox[0].body


def test_email_can_be_switched_off(world, mailoutbox, django_capture_on_commit_callbacks):
    staff, client, project = world
    s = ns.settings_for(client)
    s.email = False
    s.save()
    report = ps.save_report(project=project, user=staff, day=ps.timezone.localdate(), summary="x", items=["y"])
    with django_capture_on_commit_callbacks(execute=True):
        ps.publish_report(report=report, user=staff)
    assert Notification.objects.filter(user=client).count() == 1 and len(mailoutbox) == 0


def test_an_empty_report_cannot_be_published(world):
    staff, _, project = world
    report = ps.save_report(project=project, user=staff, day=ps.timezone.localdate())
    with pytest.raises(Exception):
        ps.publish_report(report=report, user=staff)


def test_history_hides_drafts_and_internal_notes_from_the_client(world):
    staff, client, project = world
    day = ps.timezone.localdate()
    ps.save_report(project=project, user=staff, day=day, summary="draft", items=["a"])
    ps.add_update(project=project, user=staff, message="secret", is_public=False)
    ps.add_update(project=project, user=staff, message="shown", is_public=True)
    seen = api(client).get(f"/api/projects/{project.pk}/history/").json()
    assert [e["title"] for e in seen] == ["shown"]
    assert len(api(staff).get(f"/api/projects/{project.pk}/history/").json()) == 3


def test_report_draft_is_built_from_the_days_work(world):
    staff, _, project = world
    m = Milestone.objects.create(project=project, title="Login page")
    ps.edit_milestone(milestone=m, status="done")
    ps.add_update(project=project, user=staff, message="Fixed the footer\nmore detail")
    d = api(staff).get(f"/api/projects/{project.pk}/reports/draft/").json()
    assert d["items"] == ["Completed: Login page", "Fixed the footer"]


def test_only_staff_write_reports_and_clients_cannot_peek_at_others(world):
    staff, client, project = world
    body = {"summary": "x", "items": ["a"], "publish": True}
    assert api(client).post(f"/api/projects/{project.pk}/reports/", body, format="json").status_code == 403
    assert api(staff).post(f"/api/projects/{project.pk}/reports/", body, format="json").status_code == 201
    stranger = mk("other@example.com")
    assert api(stranger).get(f"/api/projects/{project.pk}/history/").status_code == 404


def test_notifications_list_count_and_read(world):
    _, client, _ = world
    ns.notify(client, kind="system", title="One")
    ns.notify(client, kind="system", title="Two")
    c = api(client)
    assert c.get("/api/notifications/unread/").json()["unread"] == 2
    first = c.get("/api/notifications/").json()["items"][0]["id"]
    c.post("/api/notifications/read/", {"ids": [first]}, format="json")
    assert c.get("/api/notifications/unread/").json()["unread"] == 1
    c.post("/api/notifications/read/", {}, format="json")
    assert c.get("/api/notifications/unread/").json()["unread"] == 0


def test_notifications_are_private():
    a, b = mk("a@example.com"), mk("b@example.com")
    n = ns.notify(a, kind="system", title="Mine")
    assert api(b).get("/api/notifications/").json()["items"] == []
    api(b).post("/api/notifications/read/", {"ids": [n.pk]}, format="json")
    assert Notification.objects.get(pk=n.pk).read_at is None


def test_conversation_flows_both_ways(world):
    staff, client, _ = world
    api(client).post("/api/messages/", {"body": "Hello, any news?"}, format="json")
    assert Notification.objects.filter(user=staff, kind="message").count() == 1
    convos = api(staff).get("/api/conversations/").json()
    assert convos[0]["unread"] == 1
    api(staff).post(f"/api/conversations/{client.pk}/", {"body": "Yes! Checkout is live."}, format="json")
    assert api(client).get("/api/notifications/unread/").json()["messages"] == 1
    thread = api(client).get("/api/messages/").json()
    assert [m["from_team"] for m in thread] == [False, True]
    assert api(client).get("/api/notifications/unread/").json()["messages"] == 0
    assert api(client).get("/api/conversations/").status_code == 403
    assert Message.objects.count() == 2


def test_push_subscription_is_stored_validated_and_removed_when_dead(world, settings):
    _, client, _ = world
    c = api(client)
    sub = {"endpoint": "https://push.example/abc", "keys": {"p256dh": "k", "auth": "a"}}
    assert c.post("/api/push/subscription/", sub, format="json").status_code == 201
    assert c.post("/api/push/subscription/", {"endpoint": "http://insecure", "keys": {}}, format="json").status_code == 400
    settings.VAPID_PUBLIC_KEY, settings.VAPID_PRIVATE_KEY = "pub", "priv"
    from notifications import push

    class Gone(Exception):
        response = type("R", (), {"status_code": 410})()

    from pywebpush import WebPushException

    err = WebPushException("gone", response=Gone.response)
    with patch("pywebpush.webpush", side_effect=err):
        assert push.send_to_user(client, {"title": "x"}) == 0
    assert PushSubscription.objects.count() == 0


def test_push_without_keys_is_a_quiet_no_op(world):
    _, client, _ = world
    from notifications import push

    assert push.enabled() is False and push.send_to_user(client, {"title": "x"}) == 0

from unittest.mock import patch

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from leads import emailer, services
from leads.models import Lead

pytestmark = pytest.mark.django_db
User = get_user_model()
DATA = {"name": "Rahim", "email": "r@example.com", "need": "ecommerce", "details": "I need a shop."}


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.REQUIRE_STAFF_MFA = False
    cache.clear()


def staff():
    u = User.objects.create_user("staff@example.com", "a-very-long-pass-123", is_staff=True)
    EmailAddress.objects.create(user=u, email=u.email, primary=True, verified=True)
    c = APIClient()
    c.force_login(u)
    return c


def test_the_email_is_sent_straight_away_without_the_worker(django_capture_on_commit_callbacks):
    with (
        patch("leads.emailer.send_lead_email") as send,
        patch("leads.services.send_lead_notification") as task,
    ):
        with django_capture_on_commit_callbacks(execute=True):
            lead = services.create_lead(**DATA)
    send.assert_called_once()
    task.delay.assert_not_called()
    lead.refresh_from_db()
    assert lead.notified_at is not None


def test_if_the_direct_email_fails_the_worker_retries_and_the_reason_is_kept(
    django_capture_on_commit_callbacks,
):
    with (
        patch(
            "leads.emailer.send_lead_email",
            side_effect=emailer.EmailError("SMTP send failed: nope"),
        ),
        patch("leads.services.send_lead_notification") as task,
    ):
        with django_capture_on_commit_callbacks(execute=True):
            lead = services.create_lead(**DATA)
    task.delay.assert_called_once_with(str(lead.id))
    lead.refresh_from_db()
    assert lead.notified_at is None and "nope" in lead.notify_error


def test_an_unexpected_error_never_breaks_the_visitors_request(django_capture_on_commit_callbacks):
    with (
        patch("leads.services.notify", side_effect=RuntimeError("boom")),
        patch("leads.services.send_lead_notification"),
    ):
        with django_capture_on_commit_callbacks(execute=True):
            services.create_lead(**DATA)
    assert Lead.objects.count() == 1


def test_only_staff_can_read_the_inbox():
    Lead.objects.create(**DATA)
    assert APIClient().get("/api/leads/inbox/").status_code in (401, 403)
    plain = User.objects.create_user("p@example.com", "a-very-long-pass-123")
    EmailAddress.objects.create(user=plain, email=plain.email, primary=True, verified=True)
    c = APIClient()
    c.force_login(plain)
    assert c.get("/api/leads/inbox/").status_code == 403
    rows = staff().get("/api/leads/inbox/").json()
    assert rows[0]["name"] == "Rahim" and rows[0]["emailed"] is False


def test_status_can_be_changed_and_bad_values_refused():
    lead = Lead.objects.create(**DATA)
    c = staff()
    assert (
        c.patch(f"/api/leads/inbox/{lead.id}/", {"status": "replied"}, format="json").json()[
            "status"
        ]
        == "replied"
    )
    assert (
        c.patch(f"/api/leads/inbox/{lead.id}/", {"status": "x"}, format="json").status_code == 400
    )


def test_resend_reports_what_happened():
    lead = Lead.objects.create(**DATA)
    c = staff()
    with patch(
        "leads.emailer.send_lead_email", side_effect=emailer.EmailError("SMTP send failed: auth")
    ):
        out = c.post(f"/api/leads/inbox/{lead.id}/resend/").json()
    assert out["emailed"] is False and "auth" in out["email_error"]
    with patch("leads.emailer.send_lead_email"):
        out = c.post(f"/api/leads/inbox/{lead.id}/resend/").json()
    assert out["emailed"] is True and out["email_error"] == ""


def test_the_dashboard_counts_new_messages_for_staff():
    Lead.objects.create(**DATA)
    data = staff().get("/api/dashboard/").json()
    item = next(a for a in data["attention"] if a["key"] == "enquiries")
    assert item["count"] == 1 and item["href"] == "/app/messages"

from unittest.mock import MagicMock, patch

import httpx
import pytest
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient

from leads import emailer, tasks
from leads.models import Lead

pytestmark = pytest.mark.django_db

URL = "/api/leads/"

VALID = {
    "name": "Rahim Uddin",
    "email": "rahim@example.com",
    "need": "ecommerce",
    "details": "I need an online store for my clothing shop.",
    "budget": "500_1500",
    "timeline": "1_3m",
}


@pytest.fixture(autouse=True)
def _clear_cache():
    # The rate limit counter lives in the cache; start every test clean.
    cache.clear()


@pytest.fixture
def client():
    return APIClient()


def post(client, **overrides):
    return client.post(URL, {**VALID, **overrides}, format="json")


# --- creating a lead ---------------------------------------------------------


def test_valid_enquiry_is_saved(client):
    response = post(client)
    assert response.status_code == 201
    assert response.json() == {"detail": "received"}
    lead = Lead.objects.get()
    assert (lead.name, lead.email, lead.need) == ("Rahim Uddin", "rahim@example.com", "ecommerce")
    assert lead.status == "new"


def test_budget_and_timeline_are_optional(client):
    response = client.post(
        URL, {k: v for k, v in VALID.items() if k not in ("budget", "timeline")}, format="json"
    )
    assert response.status_code == 201
    assert Lead.objects.get().budget == ""


def test_ip_is_stored_hashed_never_raw(client):
    post(client)
    lead = Lead.objects.get()
    assert len(lead.ip_hash) == 64
    assert "127.0.0.1" not in lead.ip_hash


@pytest.mark.parametrize(
    "overrides",
    [
        {"name": ""},
        {"email": "not-an-email"},
        {"need": "hack-the-planet"},
        {"details": "short"},
        {"details": "x" * 5001},
        {"budget": "a million dollars"},
        {"name": "n" * 121},
    ],
)
def test_invalid_input_is_rejected_and_nothing_is_saved(client, overrides):
    response = post(client, **overrides)
    assert response.status_code == 400
    assert Lead.objects.count() == 0


def test_get_is_not_allowed(client):
    assert client.get(URL).status_code == 405


def test_the_endpoint_never_returns_stored_data(client):
    body = post(client).json()
    assert "rahim@example.com" not in str(body)


# --- spam protection -------------------------------------------------------


def test_filled_honeypot_looks_successful_but_saves_nothing(client):
    response = post(client, website="http://spam.example")
    assert response.status_code == 201
    assert Lead.objects.count() == 0


def test_sixth_enquiry_from_the_same_address_is_rate_limited(client):
    for _ in range(5):
        assert post(client).status_code == 201
    assert post(client).status_code == 429
    assert Lead.objects.count() == 5


# --- notification ------------------------------------------------------------


def test_owner_is_notified_after_commit(client, django_capture_on_commit_callbacks):
    with patch("leads.emailer.send_lead_email") as send:
        with django_capture_on_commit_callbacks(execute=True):
            post(client)
    send.assert_called_once()
    assert Lead.objects.get().notified_at is not None


def test_enquiry_survives_an_email_failure(client, django_capture_on_commit_callbacks):
    with patch("leads.emailer.send_lead_email", side_effect=emailer.EmailError("boom")):
        with django_capture_on_commit_callbacks(execute=True):
            response = post(client)
    assert response.status_code == 201
    lead = Lead.objects.get()
    assert lead.notified_at is None
    assert "boom" in lead.notify_error


def test_notification_is_not_sent_twice(client):
    post(client)
    lead = Lead.objects.get()
    with patch("leads.emailer.send_lead_email") as send:
        tasks.send_lead_notification(str(lead.id))
        tasks.send_lead_notification(str(lead.id))
    assert send.call_count == 1


# --- the Resend request ------------------------------------------------------


@override_settings(
    RESEND_API_KEY="re_test_key",
    LEADS_FROM_EMAIL="Site <noreply@wahednur.tech>",
    LEADS_NOTIFY_TO="owner@example.com",
)
def test_resend_request_shape():
    lead = Lead.objects.create(**VALID)
    fake = MagicMock(status_code=200)
    with patch("leads.emailer.httpx.post", return_value=fake) as http:
        emailer.send_lead_email(lead)
    args, kwargs = http.call_args
    assert args[0] == "https://api.resend.com/emails"
    assert kwargs["headers"]["Authorization"] == "Bearer re_test_key"
    assert kwargs["headers"]["Idempotency-Key"] == f"lead-{lead.id}"
    body = kwargs["json"]
    assert body["to"] == ["owner@example.com"]
    assert body["from"] == "Site <noreply@wahednur.tech>"
    assert body["reply_to"] == "rahim@example.com"
    assert body["subject"] == "New enquiry: Online store (eCommerce)"


@override_settings(RESEND_API_KEY="re_test_key")
def test_user_input_is_escaped_in_the_html_email():
    lead = Lead.objects.create(
        **{
            **VALID,
            "name": "<script>alert(1)</script>",
            "details": "<img src=x onerror=boom>\nline2",
        }
    )
    subject, text, body_html = emailer.build_message(lead)
    assert "<script>" not in body_html
    assert "&lt;script&gt;" in body_html
    assert "<img" not in body_html
    assert "<br>" in body_html  # newlines become line breaks, nothing else is raw
    assert "<script>" not in subject


@override_settings(RESEND_API_KEY="re_test_key")
@pytest.mark.parametrize("status_code", [401, 422, 429, 500])
def test_provider_errors_raise_email_error(status_code):
    lead = Lead.objects.create(**VALID)
    with patch("leads.emailer.httpx.post", return_value=MagicMock(status_code=status_code)):
        with pytest.raises(emailer.EmailError):
            emailer.send_lead_email(lead)


@override_settings(RESEND_API_KEY="re_test_key")
def test_network_errors_raise_email_error():
    lead = Lead.objects.create(**VALID)
    with patch("leads.emailer.httpx.post", side_effect=httpx.ConnectTimeout("slow")):
        with pytest.raises(emailer.EmailError):
            emailer.send_lead_email(lead)


@override_settings(RESEND_API_KEY="")
def test_without_a_key_nothing_is_sent_and_nothing_fails():
    lead = Lead.objects.create(**VALID)
    with patch("leads.emailer.httpx.post") as http:
        emailer.send_lead_email(lead)
    http.assert_not_called()

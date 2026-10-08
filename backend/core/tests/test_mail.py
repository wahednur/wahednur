from unittest.mock import MagicMock, patch

import httpx
import pytest
from django.core.mail import EmailMultiAlternatives

from core import tasks
from core.mail import ResendEmailBackend, build_payload


def _message():
    message = EmailMultiAlternatives(
        "Subject", "plain body", "from@example.com", ["to@example.com"]
    )
    message.attach_alternative("<p>html body</p>", "text/html")
    return message


def test_payload_has_text_html_and_an_idempotency_key():
    payload = build_payload(_message())
    assert payload["to"] == ["to@example.com"]
    assert payload["text"] == "plain body" and payload["html"] == "<p>html body</p>"
    assert payload["idempotency_key"].startswith("mail-")


def test_backend_sends_straight_away_without_needing_the_worker(settings):
    settings.RESEND_API_KEY = "k"
    with patch("core.tasks.httpx.post", return_value=MagicMock(status_code=200)) as post:
        with patch("core.mail.send_email.delay") as delay:
            sent = ResendEmailBackend().send_messages([_message(), _message()])
    assert sent == 2 and post.call_count == 2 and delay.call_count == 0


def test_backend_hands_the_same_email_to_the_worker_when_resend_is_unreachable(settings):
    settings.RESEND_API_KEY = "k"
    with patch("core.tasks.httpx.post", side_effect=httpx.ConnectTimeout("slow")):
        with patch("core.mail.send_email.delay") as delay:
            sent = ResendEmailBackend().send_messages([_message()])
    assert sent == 1 and delay.call_count == 1
    assert delay.call_args.args[0]["idempotency_key"].startswith(
        "mail-"
    )  # same key: no double send


def test_backend_logs_a_refusal_and_does_not_break_the_request(settings, caplog):
    settings.RESEND_API_KEY = "k"
    refused = MagicMock(status_code=403, text="The wahednur.tech domain is not verified")
    with patch("core.tasks.httpx.post", return_value=refused):
        with patch("core.mail.send_email.delay") as delay:
            sent = ResendEmailBackend().send_messages([_message()])
    assert sent == 0 and delay.call_count == 0
    assert "not verified" in caplog.text


def test_task_posts_to_resend_with_bearer_and_idempotency_key(settings):
    settings.RESEND_API_KEY = "re_test"
    payload = build_payload(_message())
    with patch("core.tasks.httpx.post", return_value=MagicMock(status_code=200)) as post:
        tasks.send_email.run(payload)
    args, kwargs = post.call_args
    assert args[0] == "https://api.resend.com/emails"
    assert kwargs["headers"]["Authorization"] == "Bearer re_test"
    assert kwargs["headers"]["Idempotency-Key"] == payload["idempotency_key"]
    assert "idempotency_key" not in kwargs["json"]


@pytest.mark.parametrize("status", [429, 500])
def test_task_retries_on_temporary_provider_errors(status):
    with patch("core.tasks.httpx.post", return_value=MagicMock(status_code=status, text="x")):
        with pytest.raises(tasks.MailError):
            tasks.send_email.run(build_payload(_message()))


@pytest.mark.parametrize("status", [401, 403, 422])
def test_task_gives_up_on_refusals(status):
    with patch("core.tasks.httpx.post", return_value=MagicMock(status_code=status, text="no")):
        with pytest.raises(tasks.MailRejected):
            tasks.send_email.run(build_payload(_message()))


def test_task_raises_on_network_errors():
    with patch("core.tasks.httpx.post", side_effect=httpx.ConnectTimeout("slow")):
        with pytest.raises(tasks.MailError):
            tasks.send_email.run(build_payload(_message()))


# --- SMTP (Gmail and others) -------------------------------------------------------------
def test_smtp_problems_are_logged_not_raised(caplog):
    from core.mail import SafeSMTPBackend

    backend = SafeSMTPBackend(host="127.0.0.1", port=1, timeout=1)  # nothing listens here
    assert backend.send_messages([_message()]) == 0
    assert "SMTP send failed" in caplog.text


def test_lead_notice_goes_through_smtp_when_it_is_configured(settings, mailoutbox):
    from django.core.mail import get_connection

    from leads import emailer
    from leads.models import Lead

    settings.EMAIL_HOST, settings.RESEND_API_KEY = "smtp.example.com", ""
    settings.EMAIL_USE_SMTP = True
    settings.DEFAULT_FROM_EMAIL, settings.LEADS_NOTIFY_TO = "me@example.com", "owner@example.com"
    lead = Lead(name="Rahim", email="rahim@example.com", need="ecommerce", details="Hi")
    with patch(
        "django.core.mail.get_connection",
        return_value=get_connection("django.core.mail.backends.locmem.EmailBackend"),
    ):
        emailer.send_lead_email(lead)
    assert len(mailoutbox) == 1
    assert mailoutbox[0].to == ["owner@example.com"] and mailoutbox[0].reply_to == [
        "rahim@example.com"
    ]
    assert mailoutbox[0].from_email == "me@example.com"


def test_lead_smtp_failure_reaches_the_retry_logic(settings):
    from leads import emailer
    from leads.models import Lead

    settings.EMAIL_HOST, settings.EMAIL_PORT, settings.EMAIL_TIMEOUT = "127.0.0.1", 1, 1
    settings.EMAIL_USE_SMTP = True
    settings.EMAIL_USE_SSL = settings.EMAIL_USE_TLS = False
    lead = Lead(name="Rahim", email="rahim@example.com", need="ecommerce", details="Hi")
    with pytest.raises(emailer.EmailError):
        emailer.send_lead_email(lead)


def test_send_test_email_command_explains_a_smtp_failure(settings):
    from django.core.management import call_command
    from django.core.management.base import CommandError

    settings.EMAIL_HOST, settings.EMAIL_PORT, settings.EMAIL_TIMEOUT = "127.0.0.1", 1, 1
    settings.EMAIL_USE_SMTP = True
    settings.EMAIL_USE_SSL = settings.EMAIL_USE_TLS = False
    with pytest.raises(CommandError, match="mail server"):
        call_command("send_test_email", "a@b.c")


def test_email_provider_switch_picks_resend_even_when_smtp_values_are_left_in(monkeypatch):
    """EMAIL_PROVIDER=resend must win over a forgotten EMAIL_HOST."""
    import importlib

    from config.settings import base

    monkeypatch.setenv("EMAIL_HOST", "smtp.gmail.com")
    monkeypatch.setenv("RESEND_API_KEY", "re_x")
    try:
        monkeypatch.setenv("EMAIL_PROVIDER", "resend")
        assert importlib.reload(base).EMAIL_BACKEND == "core.mail.ResendEmailBackend"
        monkeypatch.setenv("EMAIL_PROVIDER", "")
        assert importlib.reload(base).EMAIL_BACKEND == "core.mail.SafeSMTPBackend"
        monkeypatch.delenv("EMAIL_HOST")
        assert importlib.reload(base).EMAIL_BACKEND == "core.mail.ResendEmailBackend"
    finally:
        monkeypatch.undo()
        importlib.reload(base)

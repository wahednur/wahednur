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

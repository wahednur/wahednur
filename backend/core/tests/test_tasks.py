def test_a_refusal_is_not_retried_and_keeps_resends_explanation(settings, monkeypatch):
    import httpx
    import pytest

    from core import tasks

    settings.RESEND_API_KEY = "k"

    class R:
        status_code = 403
        text = '{"message":"The wahednur.tech domain is not verified."}'

    monkeypatch.setattr(httpx, "post", lambda *a, **k: R())
    with pytest.raises(tasks.MailRejected) as err:
        tasks.send_email.run({"to": ["a@b.c"]})
    assert "not verified" in str(err.value)


def test_a_resend_outage_is_retried(settings, monkeypatch):
    import httpx
    import pytest

    from core import tasks

    settings.RESEND_API_KEY = "k"

    class R:
        status_code = 503
        text = "down"

    monkeypatch.setattr(httpx, "post", lambda *a, **k: R())
    with pytest.raises(tasks.MailError):
        tasks.send_email.run({"to": ["a@b.c"]})


def test_send_test_email_command_reports_a_missing_key(settings):
    import pytest
    from django.core.management import call_command
    from django.core.management.base import CommandError

    settings.RESEND_API_KEY = ""
    with pytest.raises(CommandError, match="RESEND_API_KEY"):
        call_command("send_test_email", "a@b.c")


def test_send_test_email_command_shows_resends_reason(settings, monkeypatch):
    import httpx
    import pytest
    from django.core.management import call_command
    from django.core.management.base import CommandError

    settings.RESEND_API_KEY = "k"

    class R:
        status_code = 403
        text = "domain is not verified"

    monkeypatch.setattr(httpx, "post", lambda *a, **k: R())
    with pytest.raises(CommandError, match="not verified"):
        call_command("send_test_email", "a@b.c")

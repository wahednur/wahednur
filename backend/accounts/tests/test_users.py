import pytest
from django.contrib.auth import authenticate, get_user_model
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import Client

User = get_user_model()
pytestmark = pytest.mark.django_db


def test_the_user_model_is_ours_and_logs_in_by_email():
    assert User._meta.label == "accounts.User"
    assert User.USERNAME_FIELD == "email"


def test_create_user_normalises_the_email():
    user = User.objects.create_user("  Wahed@Example.COM ", "s3cret-pass-123")
    assert user.email == "wahed@example.com"
    assert user.check_password("s3cret-pass-123")
    assert not user.is_staff and not user.is_superuser


def test_email_is_required():
    with pytest.raises(ValueError):
        User.objects.create_user("", "x")


def test_superuser_flags_and_guard():
    admin = User.objects.create_superuser("root@example.com", "s3cret-pass-123")
    assert admin.is_staff and admin.is_superuser
    with pytest.raises(ValueError):
        User.objects.create_superuser("b@example.com", "x", is_staff=False)


def test_emails_are_unique_ignoring_case():
    User.objects.create_user("a@example.com", "pw-123456789")
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create_user("A@example.com", "pw-123456789")


def test_authenticate_with_email_and_wrong_password():
    User.objects.create_user("a@example.com", "right-pass-123")
    assert authenticate(username="a@example.com", password="right-pass-123") is not None
    assert authenticate(username="a@example.com", password="wrong") is None


def test_inactive_user_cannot_authenticate():
    User.objects.create_user("a@example.com", "right-pass-123", is_active=False)
    assert authenticate(username="a@example.com", password="right-pass-123") is None


def test_createsuperuser_command_works_with_an_email():
    call_command("createsuperuser", interactive=False, email="boss@example.com")
    assert User.objects.get(email="boss@example.com").is_superuser


def test_django_admin_login_goes_through_allauth(settings):
    """The admin shares allauth's rate limits and two-factor step instead of its own form."""
    response = Client().get(f"/{settings.ADMIN_URL}login/")
    assert response.status_code == 302
    assert response.url.startswith("/accounts/login/")


def test_admin_is_closed_to_anonymous_visitors(settings):
    response = Client().get(f"/{settings.ADMIN_URL}")
    assert response.status_code == 302
    assert "login" in response.url

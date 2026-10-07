import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

User = get_user_model()
pytestmark = pytest.mark.django_db
PW = "an-owner-long-pass-123"


def test_creates_a_superuser_with_a_verified_email_and_the_owner_group(monkeypatch):
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", PW)
    call_command("bootstrap_owner", email="Boss@Example.com")
    user = User.objects.get(email="boss@example.com")
    assert user.is_superuser and user.is_staff and user.check_password(PW)
    assert EmailAddress.objects.get(user=user).verified
    assert "owner" in user.roles
    assert user.groups.filter(name="owner").exists()


def test_repairs_an_existing_account_without_losing_it(monkeypatch):
    monkeypatch.delenv("DJANGO_SUPERUSER_PASSWORD", raising=False)
    user = User.objects.create_superuser("boss@example.com", PW)  # no EmailAddress yet
    call_command("bootstrap_owner", email="boss@example.com")
    assert User.objects.count() == 1
    user.refresh_from_db()
    assert user.check_password(PW)  # password untouched when none is given
    assert EmailAddress.objects.get(user=user).verified


def test_rejects_a_weak_password(monkeypatch):
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", "short")
    with pytest.raises(CommandError):
        call_command("bootstrap_owner", email="boss@example.com")
    assert not User.objects.exists()

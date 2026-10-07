import json
import re

import pytest
from allauth.account.models import EmailAddress
from allauth.mfa.models import Authenticator
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core import mail
from django.core.cache import cache
from django.test import Client, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.adapters import AccountAdapter
from accounts.models import AuditEvent
from accounts.permissions import IsOwner, IsStaffMember, IsVerifiedUser

User = get_user_model()
pytestmark = pytest.mark.django_db

B = "/_allauth/browser/v1"
PW = "a-very-long-pass-123"


@pytest.fixture(autouse=True)
def _clean():
    cache.clear()  # rate-limit counters live in the cache
    mail.outbox.clear()


def call(client, method, path, data=None):
    kwargs = {}
    if data is not None:
        kwargs = {"data": json.dumps(data), "content_type": "application/json"}
    response = getattr(client, method)(B + path, **kwargs)
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    return response.status_code, payload


def last_code():
    return re.search(r"\b([A-Z0-9]{4}-[A-Z0-9]{4})\b", mail.outbox[-1].body).group(1)


def verified_user(email="user@example.com", password=PW, **extra):
    user = User.objects.create_user(email, password, **extra)
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    return user


def login(client, email="user@example.com", password=PW):
    return call(client, "post", "/auth/login", {"email": email, "password": password})


# --- sign-up and email verification ------------------------------------------


def test_signup_needs_email_verification_before_anyone_is_signed_in():
    c = Client()
    status, body = call(c, "post", "/auth/signup", {"email": "New@Example.com", "password": PW})
    assert status == 401
    assert {"id": "verify_email", "is_pending": True} in body["data"]["flows"]
    assert call(c, "get", "/auth/session")[0] == 401
    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject.startswith("wahednur.tech: ")


def test_verifying_the_code_signs_in_and_gives_the_client_role():
    c = Client()
    call(c, "post", "/auth/signup", {"email": "new@example.com", "password": PW})
    status, body = call(c, "post", "/auth/email/verify", {"key": last_code()})
    assert status == 200 and body["meta"]["is_authenticated"] is True
    user = User.objects.get(email="new@example.com")
    assert list(user.groups.values_list("name", flat=True)) == ["client"]
    assert AuditEvent.objects.filter(user=user, action="signup").exists()


def test_a_wrong_verification_code_is_rejected():
    c = Client()
    call(c, "post", "/auth/signup", {"email": "new@example.com", "password": PW})
    status, _ = call(c, "post", "/auth/email/verify", {"key": "AAAA-BBBB"})
    assert status == 400
    assert call(c, "get", "/auth/session")[0] == 401


def test_cannot_log_in_before_the_email_is_verified():
    User.objects.create_user("new@example.com", PW)
    EmailAddress.objects.create(
        user=User.objects.get(email="new@example.com"),
        email="new@example.com",
        primary=True,
        verified=False,
    )
    status, body = login(Client(), "new@example.com")
    assert status == 401
    assert any(f["id"] == "verify_email" for f in body["data"]["flows"])


@pytest.mark.parametrize("password", ["short1", "password1234", "12345678901234"])
def test_weak_passwords_are_refused_at_signup(password):
    status, _ = call(
        Client(), "post", "/auth/signup", {"email": "x@example.com", "password": password}
    )
    assert status == 400
    assert not User.objects.filter(email="x@example.com").exists()


# --- email and password login --------------------------------------------------


def test_login_session_and_logout_are_audited():
    user = verified_user()
    c = Client()
    status, body = login(c)
    assert status == 200 and body["meta"]["is_authenticated"] is True
    assert call(c, "get", "/auth/session")[0] == 200
    assert c.get("/api/auth/me/").json()["email"] == "user@example.com"
    assert call(c, "delete", "/auth/session")[0] == 401
    assert call(c, "get", "/auth/session")[0] == 401
    actions = set(AuditEvent.objects.filter(user=user).values_list("action", flat=True))
    assert {"login", "logout"} <= actions


def test_email_login_ignores_letter_case():
    verified_user("user@example.com")
    assert login(Client(), "USER@Example.com")[0] == 200


def test_wrong_password_is_rejected_and_audited_without_storing_it():
    verified_user()
    status, _ = login(Client(), password="not-the-password-1")
    assert status == 400
    event = AuditEvent.objects.get(action="login_failed")
    assert event.email == "user@example.com"
    assert "not-the-password" not in " ".join(str(v) for v in vars(event).values())


def _blocked(body):
    return any(e.get("code") == "too_many_login_attempts" for e in body.get("errors", []))


def test_repeated_failures_are_rate_limited():
    verified_user()
    c = Client()
    results = [login(c, password="wrong-password-123") for _ in range(7)]
    assert any(_blocked(body) for _, body in results)
    _, body = login(c)  # even the right password has to wait
    assert _blocked(body)


def test_login_requires_a_csrf_token():
    verified_user()
    c = Client(enforce_csrf_checks=True)
    response = c.post(
        B + "/auth/login",
        data=json.dumps({"email": "user@example.com", "password": PW}),
        content_type="application/json",
    )
    assert response.status_code == 403


def test_unknown_email_looks_the_same_as_a_known_one():
    verified_user()
    known = call(Client(), "post", "/auth/password/request", {"email": "user@example.com"})[0]
    unknown = call(Client(), "post", "/auth/password/request", {"email": "nobody@example.com"})[0]
    assert known == unknown


# --- password reset and setting a password after Google -------------------------


def test_password_reset_by_code_then_login_with_the_new_password():
    verified_user()
    c = Client()
    status, body = call(c, "post", "/auth/password/request", {"email": "user@example.com"})
    assert status == 401
    new_password = "brand-new-long-pass-456"
    status, _ = call(
        c, "post", "/auth/password/reset", {"key": last_code(), "password": new_password}
    )
    assert status in (200, 401)
    assert login(Client(), password=PW)[0] == 400
    assert login(Client(), password=new_password)[0] == 200
    assert AuditEvent.objects.filter(action="password_reset").exists()


def test_google_user_can_set_a_password_and_then_use_both_ways():
    """Someone who first signed in with Google has no password. Setting one must let them
    sign in with email and password too, while the Google link stays."""
    user = User.objects.create_user("g@example.com", None)  # unusable password, like Google signup
    EmailAddress.objects.create(user=user, email="g@example.com", primary=True, verified=True)
    assert not user.has_usable_password()
    assert login(Client(), "g@example.com")[0] in (400, 401)

    c = Client()
    c.force_login(user, backend="django.contrib.auth.backends.ModelBackend")
    me = c.get("/api/auth/me/").json()
    assert me["has_password"] is False
    status, _ = call(
        c, "post", "/account/password/change", {"new_password": "my-new-long-pass-789"}
    )
    assert status == 200
    assert c.get("/api/auth/me/").json()["has_password"] is True
    assert login(Client(), "g@example.com", "my-new-long-pass-789")[0] == 200
    assert AuditEvent.objects.filter(user=user, action="password_set").exists()


# --- Google configuration and safe redirects -------------------------------------


def test_google_is_offered_only_when_configured():
    assert (
        call(Client(), "get", "/config")[1]["data"].get("socialaccount", {}).get("providers", [])
        == []
    )
    google = {
        "google": {
            "APP": {"client_id": "id", "secret": "secret", "key": ""},
            "SCOPE": ["profile", "email"],
        }
    }
    with override_settings(SOCIALACCOUNT_PROVIDERS=google):
        providers = call(Client(), "get", "/config")[1]["data"]["socialaccount"]["providers"]
    assert [p["id"] for p in providers] == ["google"]


def test_after_google_sign_in_only_our_own_site_is_a_safe_redirect():
    from allauth.core.context import request_context
    from django.test import RequestFactory

    adapter = AccountAdapter()
    with request_context(RequestFactory().get("/")):
        assert adapter.is_safe_url("https://www.wahednur.tech/app")
        assert not adapter.is_safe_url("https://evil.example/app")
        assert not adapter.is_safe_url("https://www.wahednur.tech.evil.example/")


def test_social_login_connects_to_an_existing_verified_account_only():
    from django.conf import settings

    assert settings.SOCIALACCOUNT_EMAIL_AUTHENTICATION is True
    assert settings.SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT is True
    assert settings.ACCOUNT_EMAIL_VERIFICATION == "mandatory"


# --- who am I, roles and permissions ------------------------------------------------


def test_me_is_closed_to_anonymous_visitors():
    assert Client().get("/api/auth/me/").status_code == 403


def test_me_reports_roles_and_security_state():
    owner = verified_user("owner@example.com", is_staff=True, is_superuser=True)
    c = Client()
    c.force_login(owner, backend="django.contrib.auth.backends.ModelBackend")
    data = c.get("/api/auth/me/").json()
    assert data["roles"] == ["owner"]
    assert data["email_verified"] is True and data["has_password"] is True
    assert data["mfa_enabled"] is False


def test_the_three_roles_exist():
    assert set(Group.objects.values_list("name", flat=True)) >= {"owner", "staff", "client"}


def _allowed(permission, user):
    request = APIRequestFactory().get("/")
    force_authenticate(request, user=user)
    request.user = user
    return permission().has_permission(request, None)


def _add_totp(user):
    Authenticator.objects.create(user=user, type=Authenticator.Type.TOTP, data={"secret": "x"})


def test_staff_need_two_factor_authentication():
    staff = verified_user("staff@example.com", is_staff=True)
    assert not _allowed(IsStaffMember, staff)
    _add_totp(staff)
    assert _allowed(IsStaffMember, staff)


def test_owner_needs_to_be_superuser_and_have_two_factor():
    staff = verified_user("staff@example.com", is_staff=True)
    _add_totp(staff)
    assert not _allowed(IsOwner, staff)  # staff are not owners
    owner = verified_user("owner@example.com", is_staff=True, is_superuser=True)
    assert not _allowed(IsOwner, owner)
    _add_totp(owner)
    assert _allowed(IsOwner, owner)


def test_unverified_or_inactive_or_anonymous_users_are_refused():
    unverified = User.objects.create_user("u@example.com", PW)
    assert not _allowed(IsVerifiedUser, unverified)
    inactive = verified_user("i@example.com", is_active=False)
    assert not _allowed(IsVerifiedUser, inactive)
    from django.contrib.auth.models import AnonymousUser

    assert not _allowed(IsVerifiedUser, AnonymousUser())


def test_the_two_factor_rule_can_be_switched_off_for_local_work(settings):
    settings.REQUIRE_STAFF_MFA = False
    assert _allowed(IsStaffMember, verified_user("s@example.com", is_staff=True))

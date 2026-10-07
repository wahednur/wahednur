"""Audit trail and default role. Only metadata is stored: no passwords, codes or tokens."""

from allauth.account import signals as account_signals
from allauth.mfa import signals as mfa_signals
from django.contrib.auth import signals as auth_signals
from django.contrib.auth.models import Group
from django.dispatch import receiver

from core.utils import client_ip, hash_ip

from .models import AuditEvent
from .roles import CLIENT


def record(action, request=None, user=None, email=""):
    ip = client_ip(request) if request is not None else ""
    agent = request.META.get("HTTP_USER_AGENT", "")[:200] if request is not None else ""
    AuditEvent.objects.create(
        user=user if getattr(user, "pk", None) else None,
        action=action,
        email=(email or "")[:254].lower(),
        ip_hash=hash_ip(ip),
        user_agent=agent,
    )


@receiver(auth_signals.user_logged_in)
def _logged_in(sender, request, user, **kw):
    record("login", request, user)


@receiver(auth_signals.user_logged_out)
def _logged_out(sender, request, user, **kw):
    record("logout", request, user)


@receiver(auth_signals.user_login_failed)
def _login_failed(sender, credentials, request=None, **kw):
    attempted = credentials.get("email") or credentials.get("username") or ""
    record("login_failed", request, None, attempted)


@receiver(account_signals.user_signed_up)
def _signed_up(sender, request, user, **kw):
    group, _ = Group.objects.get_or_create(name=CLIENT)
    user.groups.add(group)
    record("signup", request, user)


def _simple(signal, action):
    @receiver(signal, weak=False)
    def handler(sender, request=None, user=None, **kw):
        record(action, request, user)

    return handler


_simple(account_signals.password_changed, "password_changed")
_simple(account_signals.password_set, "password_set")
_simple(account_signals.password_reset, "password_reset")
_simple(mfa_signals.authenticator_added, "mfa_added")
_simple(mfa_signals.authenticator_removed, "mfa_removed")

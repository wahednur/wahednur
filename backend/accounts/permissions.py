"""Authorization building blocks for DRF views. The server decides; the UI only mirrors it.

- IsVerifiedUser: signed in, active, and the primary email is verified
- IsStaffMember:  staff account that has two-factor authentication switched on
- IsOwner:        superuser that has two-factor authentication switched on
"""

from allauth.account.models import EmailAddress
from allauth.mfa.utils import is_mfa_enabled
from django.conf import settings
from rest_framework.permissions import BasePermission


def _verified(user) -> bool:
    return EmailAddress.objects.filter(user=user, email__iexact=user.email, verified=True).exists()


def _mfa_ok(user) -> bool:
    return (not settings.REQUIRE_STAFF_MFA) or is_mfa_enabled(user)


class IsVerifiedUser(BasePermission):
    message = "Verify your email address first."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and _verified(user))


class IsStaffMember(IsVerifiedUser):
    message = "Staff access requires two-factor authentication."

    def has_permission(self, request, view):
        user = request.user
        return super().has_permission(request, view) and user.is_staff and _mfa_ok(user)


class IsOwner(IsVerifiedUser):
    message = "Owner access requires two-factor authentication."

    def has_permission(self, request, view):
        user = request.user
        return super().has_permission(request, view) and user.is_superuser and _mfa_ok(user)

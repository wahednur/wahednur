from django.conf import settings
from django.core.exceptions import ValidationError


class RoleAwareMinimumLengthValidator:
    """Customers need a shorter password than people who can see other people's data.

    Clients: PASSWORD_MIN_LENGTH_CLIENT (default 10). Staff and owner: PASSWORD_MIN_LENGTH_STAFF
    (default 12) and they must use two-step sign-in anyway. Common and all-digit passwords are
    still refused by the other validators, so a long length is not the only protection.
    """

    def validate(self, password, user=None):
        staff = bool(
            user and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
        )
        need = settings.PASSWORD_MIN_LENGTH_STAFF if staff else settings.PASSWORD_MIN_LENGTH_CLIENT
        if len(password) < need:
            raise ValidationError(
                f"This password is too short. Use at least {need} characters. "
                "Three or four random words in a row work well and are easy to remember.",
                code="password_too_short",
            )

    def get_help_text(self):
        return (
            f"At least {settings.PASSWORD_MIN_LENGTH_CLIENT} characters "
            f"({settings.PASSWORD_MIN_LENGTH_STAFF} for staff accounts)."
        )

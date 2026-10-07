from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from .roles import ALL as ROLE_NAMES
from .roles import OWNER, STAFF


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, email, password, **extra):
        if not email or not email.strip():
            raise ValueError("An email address is required.")
        user = self.model(email=self.normalize_email(email.strip()).lower(), **extra)
        user.set_password(password)  # None gives an unusable password
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        if extra["is_staff"] is not True or extra["is_superuser"] is not True:
            raise ValueError("A superuser must have is_staff=True and is_superuser=True.")
        return self._create(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """Staff account. The email address is the login (no username)."""

    email = models.EmailField("email address", max_length=254, unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        constraints = [
            # Emails are stored lowercase; this also blocks "A@x.com" next to "a@x.com".
            models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
        ]

    def __str__(self) -> str:
        return self.email

    @property
    def roles(self) -> list[str]:
        """Role names for the UI. Authorization is always decided on the server."""
        roles = [r for r in self.groups.values_list("name", flat=True) if r in ROLE_NAMES]
        if self.is_superuser and OWNER not in roles:
            roles.append(OWNER)
        if self.is_staff and STAFF not in roles and OWNER not in roles:
            roles.append(STAFF)
        return sorted(set(roles))


class AuditEvent(models.Model):
    """Security-relevant events: sign-ins, failures, password and 2FA changes."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    action = models.CharField(max_length=40, db_index=True)
    email = models.CharField(max_length=254, blank=True)  # attempted address for failed logins
    ip_hash = models.CharField(max_length=64, blank=True)
    user_agent = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.action} {self.email or self.user_id}"

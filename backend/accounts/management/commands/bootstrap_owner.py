"""Create or repair the owner account: superuser, verified primary email, `owner` group.

    python manage.py bootstrap_owner --email you@example.com
    (asks for a password; or set DJANGO_SUPERUSER_PASSWORD for scripts)

Safe to run again: it never deletes anything and only resets the password if you give one.
Two-factor authentication is still required afterwards (set it up on first sign-in).
"""

import getpass
import os

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from accounts.roles import OWNER


class Command(BaseCommand):
    help = "Create or repair the owner account (superuser with a verified email)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)

    def handle(self, *args, **options):
        User = get_user_model()
        email = options["email"].strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        if not password and (user is None or not user.has_usable_password()):
            password = getpass.getpass("Password: ")
            if password != getpass.getpass("Password (again): "):
                raise CommandError("The passwords do not match.")
        if password:
            try:
                validate_password(password)
            except ValidationError as exc:
                raise CommandError(" ".join(exc.messages)) from exc

        created = user is None
        if created:
            user = User.objects.create_superuser(email, password)
        else:
            user.is_staff = user.is_superuser = user.is_active = True
            if password:
                user.set_password(password)
            user.save()

        EmailAddress.objects.filter(user=user, primary=True).exclude(email__iexact=email).update(
            primary=False
        )
        address, _ = EmailAddress.objects.get_or_create(user=user, email=email)
        address.primary = address.verified = True
        address.save()
        group, _ = Group.objects.get_or_create(name=OWNER)
        user.groups.add(group)
        self.stdout.write(
            self.style.SUCCESS(
                f"Owner {'created' if created else 'updated'}: {email} (email verified)"
            )
        )

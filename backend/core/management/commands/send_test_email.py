"""Send one email right now and show exactly what happens. Use it on the server when sign-in
codes do not arrive:

    docker compose exec api python manage.py send_test_email you@example.com

It runs without the queue, so it tells you whether the problem is the settings, Resend itself
(unverified domain, wrong key) or the background worker.
"""

import uuid

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.tasks import MailError, MailRejected, send_email


class Command(BaseCommand):
    help = "Send a test email through Resend immediately and print the result."

    def add_arguments(self, parser):
        parser.add_argument("to")

    def handle(self, *args, to, **options):
        out = self.stdout.write
        out(f"Email backend : {settings.EMAIL_BACKEND}")
        out(f"From address  : {settings.DEFAULT_FROM_EMAIL}")
        if settings.EMAIL_USE_SMTP:
            self._smtp(to)
            return
        out(f"Resend key set: {'yes' if settings.RESEND_API_KEY else 'NO'}")
        out(f"Queue         : {settings.CELERY_BROKER_URL.split('@')[-1]}")
        if not settings.RESEND_API_KEY:
            raise CommandError(
                "No way to send email is set: fill RESEND_API_KEY (or EMAIL_HOST for SMTP)."
            )
        payload = {
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [to],
            "subject": "Test email from wahednur.tech",
            "text": "If you can read this, sending works.",
            "idempotency_key": f"test-{uuid.uuid4()}",
        }
        try:
            send_email.run(payload)  # directly, not through the queue
        except MailRejected as exc:
            raise CommandError(f"Resend refused it. {exc}") from exc
        except MailError as exc:
            raise CommandError(f"Resend could not be reached or is down. {exc}") from exc
        self.stdout.write(
            self.style.SUCCESS(f"Resend accepted the email for {to}. Check the inbox and spam.")
        )

    def _smtp(self, to):
        from django.core.mail import get_connection, send_mail

        s = settings
        mode = "SSL" if s.EMAIL_USE_SSL else "STARTTLS" if s.EMAIL_USE_TLS else "plain"
        self.stdout.write(f"SMTP server   : {s.EMAIL_HOST}:{s.EMAIL_PORT} ({mode})")
        self.stdout.write(f"SMTP user set : {'yes' if s.EMAIL_HOST_USER else 'NO'}")
        self.stdout.write(f"SMTP password : {'set' if s.EMAIL_HOST_PASSWORD else 'NOT SET'}")
        try:
            send_mail(
                "Test email from wahednur.tech",
                "If you can read this, sending works.",
                s.DEFAULT_FROM_EMAIL,
                [to],
                connection=get_connection("django.core.mail.backends.smtp.EmailBackend"),
                fail_silently=False,
            )
        except Exception as exc:  # noqa: BLE001
            raise CommandError(
                f"The mail server refused or could not be reached: {exc.__class__.__name__}: {exc}"
            ) from exc
        self.stdout.write(
            self.style.SUCCESS(
                f"The mail server accepted the email for {to}. Check the inbox and spam."
            )
        )

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
        out(f"Resend key set: {'yes' if settings.RESEND_API_KEY else 'NO'}")
        out(f"Queue         : {settings.CELERY_BROKER_URL.split('@')[-1]}")
        if not settings.RESEND_API_KEY:
            raise CommandError("RESEND_API_KEY is empty, so no email can leave the server.")
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
        out("Codes still missing? Then the worker is the problem:")
        out("  docker compose logs --tail=50 worker")

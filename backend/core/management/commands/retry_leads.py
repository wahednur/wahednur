"""Send the notification email again for contact-form messages whose email never went out.

    python manage.py retry_leads

The messages are always saved; this only repeats the email to you. It prints what the mail server
answered for each one, which is the quickest way to find out why messages do not arrive.
"""

from django.core.management.base import BaseCommand

from leads.emailer import EmailError
from leads.models import Lead
from leads.tasks import notify


class Command(BaseCommand):
    help = "Resend the notification email for contact-form messages that were never emailed."

    def handle(self, *args, **opts):
        pending = Lead.objects.filter(notified_at__isnull=True).order_by("created_at")
        if not pending:
            self.stdout.write("Nothing to send: every message has been emailed.")
            return
        for lead in pending:
            try:
                notify(str(lead.pk))
                self.stdout.write(
                    self.style.SUCCESS(f"sent   {lead.created_at:%Y-%m-%d} {lead.name}")
                )
            except EmailError as err:
                self.stdout.write(
                    self.style.ERROR(f"failed {lead.created_at:%Y-%m-%d} {lead.name}: {err}")
                )

from celery import shared_task
from django.utils import timezone

from . import emailer
from .models import Lead


@shared_task(
    bind=True,
    autoretry_for=(emailer.EmailError,),
    retry_backoff=True,
    retry_backoff_max=900,
    max_retries=5,
)
def send_lead_notification(self, lead_id: str) -> None:
    """Email the owner about a new lead. The lead is already saved, so a failing
    email provider never loses an enquiry; the task just retries."""
    lead = Lead.objects.get(pk=lead_id)
    if lead.notified_at:
        return
    try:
        emailer.send_lead_email(lead)
    except emailer.EmailError as exc:
        lead.notify_error = str(exc)[:500]
        lead.save(update_fields=["notify_error"])
        raise
    lead.notified_at = timezone.now()
    lead.notify_error = ""
    lead.save(update_fields=["notified_at", "notify_error"])

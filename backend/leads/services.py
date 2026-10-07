"""Business logic for leads. Views call these; they do not touch the model."""

from django.db import transaction

from core.utils import hash_ip

from .models import Lead
from .tasks import send_lead_notification


def create_lead(*, ip: str = "", **data) -> Lead:
    """Save the enquiry, then notify the owner in the background once the
    transaction is committed (so the worker can always find the row)."""
    data.pop("website", None)
    with transaction.atomic():
        lead = Lead.objects.create(ip_hash=hash_ip(ip), **data)
        transaction.on_commit(lambda: send_lead_notification.delay(str(lead.id)))
    return lead

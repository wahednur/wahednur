"""Business logic for leads. Views call these; they do not touch the model."""

import hashlib
import hmac

from django.conf import settings
from django.db import transaction

from .models import Lead
from .tasks import send_lead_notification


def hash_ip(ip: str) -> str:
    if not ip:
        return ""
    key = settings.SECRET_KEY.encode()
    return hmac.new(key, ip.encode(), hashlib.sha256).hexdigest()


def create_lead(*, ip: str = "", **data) -> Lead:
    """Save the enquiry, then notify the owner in the background once the
    transaction is committed (so the worker can always find the row)."""
    data.pop("website", None)
    with transaction.atomic():
        lead = Lead.objects.create(ip_hash=hash_ip(ip), **data)
        transaction.on_commit(lambda: send_lead_notification.delay(str(lead.id)))
    return lead

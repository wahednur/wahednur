"""Business logic for leads. Views call these; they do not touch the model."""

import logging

from django.db import transaction

from core.utils import hash_ip

from .emailer import EmailError
from .models import Lead
from .tasks import notify, send_lead_notification

logger = logging.getLogger(__name__)


def create_lead(*, ip: str = "", **data) -> Lead:
    """Save the enquiry, then notify the owner in the background once the
    transaction is committed (so the worker can always find the row)."""
    data.pop("website", None)
    with transaction.atomic():
        lead = Lead.objects.create(ip_hash=hash_ip(ip), **data)
        transaction.on_commit(lambda: _notify_now(str(lead.id)))
    return lead


def _notify_now(lead_id: str) -> None:
    """Send the email straight away, so it arrives even if the background worker is not running.

    Only if that fails is the same job handed to the worker, which keeps retrying. The enquiry is
    already saved, so whatever happens here never loses it and never breaks the visitor's request.
    """
    try:
        notify(lead_id)
    except EmailError:
        logger.warning("Lead %s: email failed, handed to the worker to retry", lead_id)
        send_lead_notification.delay(lead_id)
    except Exception:  # noqa: BLE001
        logger.exception("Lead %s: unexpected error while sending the email", lead_id)
        try:
            send_lead_notification.delay(lead_id)
        except Exception:  # noqa: BLE001
            logger.exception("Lead %s: could not queue the retry either", lead_id)

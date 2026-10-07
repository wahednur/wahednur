from celery import shared_task

from . import services


@shared_task
def bill_due_subscriptions() -> int:
    """Daily job: issue the invoices that fell due."""
    return services.bill_due()

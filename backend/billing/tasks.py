from celery import shared_task

from . import services


@shared_task
def send_payment_reminders() -> int:
    """Daily job: remind about installments that are due soon or overdue (once each)."""
    return services.send_reminders()

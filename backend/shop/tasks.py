from celery import shared_task

from . import services


@shared_task
def release_unpaid_orders() -> int:
    return services.release_unpaid()

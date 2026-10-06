from celery import shared_task


@shared_task
def ping() -> str:
    """Smoke-test task: confirms a worker is consuming the queue."""
    return "pong"

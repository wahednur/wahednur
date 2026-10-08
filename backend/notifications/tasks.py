from celery import shared_task

from . import push
from .models import Notification, NotificationSetting


@shared_task
def push_notification(notification_id: int) -> int:
    n = Notification.objects.select_related("user").filter(pk=notification_id).first()
    if not n:
        return 0
    setting = NotificationSetting.objects.filter(user=n.user).first()
    if setting and not setting.push:
        return 0
    return push.send_to_user(n.user, {"title": n.title, "body": n.body, "url": n.url or "/app/notifications", "tag": f"n{n.pk}"})

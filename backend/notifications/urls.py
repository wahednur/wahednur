from django.urls import path

from . import views as v

urlpatterns = [
    path("notifications/", v.NotificationList.as_view()),
    path("notifications/unread/", v.UnreadCount.as_view()),
    path("notifications/read/", v.MarkRead.as_view()),
    path("notifications/settings/", v.SettingsView.as_view()),
    path("push/key/", v.PushKey.as_view()),
    path("push/subscription/", v.PushSubscribe.as_view()),
    path("messages/", v.MyThread.as_view()),
    path("conversations/", v.Conversations.as_view()),
    path("conversations/<int:customer>/", v.ThreadWith.as_view()),
]

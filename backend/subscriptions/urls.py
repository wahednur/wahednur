from django.urls import path

from . import views as v

urlpatterns = [
    path("subscriptions/", v.SubscriptionList.as_view()),
    *[
        path(f"subscriptions/<int:pk>/{a}/", v.SubscriptionAction.as_view(action=a))
        for a in ("pause", "resume", "cancel")
    ],
]

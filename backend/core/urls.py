from django.urls import path

from .views import HealthView, LiveView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("health/live/", LiveView.as_view(), name="health-live"),
]

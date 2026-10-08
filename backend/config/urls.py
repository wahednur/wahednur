from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("_allauth/", include("allauth.headless.urls")),
    path("api/", include("core.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("leads.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("projects.urls")),
    path("api/", include("billing.urls")),
    path("api/", include("accounting.urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("subscriptions.urls")),
    path("api/", include("cms.urls")),
    path("api/", include("shop.urls")),
    path("api/", include("dashboard.urls")),
]

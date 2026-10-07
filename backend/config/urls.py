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
]

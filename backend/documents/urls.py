from django.urls import path

from . import views

urlpatterns = [
    path("documents/", views.DocumentListView.as_view(), name="document-list"),
    path("documents/local/<str:token>/", views.LocalDownloadView.as_view(), name="document-local"),
    path("documents/<uuid:pk>/", views.DocumentDetailView.as_view(), name="document-detail"),
    path(
        "documents/<uuid:pk>/download/",
        views.DocumentDownloadView.as_view(),
        name="document-download",
    ),
]

from django.urls import path

from .views import AddressDetailView, AddressListView, MeView, ProfileView

urlpatterns = [
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/profile/", ProfileView.as_view()),
    path("auth/addresses/", AddressListView.as_view()),
    path("auth/addresses/<int:pk>/", AddressDetailView.as_view()),
]

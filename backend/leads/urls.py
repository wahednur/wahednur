from django.urls import path

from .views import LeadCreateView, LeadInbox, LeadInboxDetail, LeadReplyView, LeadResend

urlpatterns = [
    path("leads/", LeadCreateView.as_view(), name="lead-create"),
    path("leads/inbox/", LeadInbox.as_view()),
    path("leads/inbox/<uuid:pk>/", LeadInboxDetail.as_view()),
    path("leads/inbox/<uuid:pk>/resend/", LeadResend.as_view()),
    path("leads/inbox/<uuid:pk>/reply/", LeadReplyView.as_view()),
]

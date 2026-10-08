from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember

from . import services
from .models import Lead
from .serializers import LeadSerializer


class LeadCreateView(APIView):
    """Public endpoint for the contact form. Write-only, rate limited."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "leads"

    def post(self, request):
        serializer = LeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # A filled honeypot means a bot. Answer as if it worked, save nothing.
        if data.get("website"):
            return Response({"detail": "received"}, status=status.HTTP_201_CREATED)

        # Same address resolution the throttle uses (honours NUM_PROXIES).
        ip = ScopedRateThrottle().get_ident(request)
        services.create_lead(ip=ip, **data)
        return Response({"detail": "received"}, status=status.HTTP_201_CREATED)


def lead_out(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "need": lead.need,
        "need_label": lead.get_need_display(),
        "budget": lead.get_budget_display() if lead.budget else "",
        "timeline": lead.get_timeline_display() if lead.timeline else "",
        "details": lead.details,
        "status": lead.status,
        "emailed": lead.notified_at is not None,
        "email_error": lead.notify_error,
        "created_at": lead.created_at,
        "replies": [
            {"id": r.id, "subject": r.subject, "body": r.body, "sent": r.sent_at is not None, "error": r.error, "created_at": r.created_at}
            for r in lead.replies.all()
        ],
    }


class LeadInbox(APIView):
    """Staff only: every enquiry, newest first. Saved even when the notification email fails."""

    permission_classes = [IsStaffMember]

    def get(self, request):
        return Response([lead_out(x) for x in Lead.objects.all()[:200]])


class LeadInboxDetail(APIView):
    permission_classes = [IsStaffMember]

    def patch(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        new = request.data.get("status")
        if new not in Lead.Status.values:
            return Response(
                {"status": "Choose a valid status."}, status=status.HTTP_400_BAD_REQUEST
            )
        lead.status = new
        lead.save(update_fields=["status"])
        return Response(lead_out(lead))


class LeadResend(APIView):
    """Try the notification email again, now, and say what happened."""

    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        from .emailer import EmailError
        from .tasks import notify

        lead = get_object_or_404(Lead, pk=pk)
        lead.notified_at = None
        lead.save(update_fields=["notified_at"])
        try:
            notify(str(lead.pk))
        except EmailError:
            pass
        lead.refresh_from_db()
        return Response(lead_out(lead))


class LeadReplyView(APIView):
    """Staff only: answer an enquiry by email from the dashboard."""

    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        from .services import reply_to_lead

        lead = get_object_or_404(Lead, pk=pk)
        subject = str(request.data.get("subject", "")).strip()
        body = str(request.data.get("body", "")).strip()
        errors = {}
        if not subject or len(subject) > 200 or "\n" in subject or "\r" in subject:
            errors["subject"] = "Write a subject on one line, up to 200 characters."
        if not body or len(body) > 10000:
            errors["body"] = "Write a message, up to 10,000 characters."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        reply_to_lead(lead, subject=subject, body=body, user=request.user)
        return Response(lead_out(lead))

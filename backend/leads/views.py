from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import services
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

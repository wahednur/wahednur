from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services


class HealthView(APIView):
    """Public liveness/readiness probe for deploys and monitoring."""

    permission_classes = [AllowAny]
    throttle_classes: list = []

    def get(self, request):
        report = services.health_report()
        healthy = report["status"] == "ok"
        code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(report, status=code)

from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsOwner, IsVerifiedUser
from billing.serializers import exact

from . import services


class DashboardView(APIView):
    permission_classes = [IsVerifiedUser]

    def get(self, request):
        # Money for the whole business is shown only to the owner (superuser with 2FA).
        is_owner = IsOwner().has_permission(request, self)
        response = Response(exact(services.build(request.user, is_owner=is_owner)))
        response["Cache-Control"] = "private, no-store"
        return response

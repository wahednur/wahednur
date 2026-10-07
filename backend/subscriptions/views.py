from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember, IsVerifiedUser

from . import services
from .serializers import subscription_out


class SubscriptionList(APIView):
    permission_classes = [IsVerifiedUser]

    def get(self, request):
        rows = services.visible_to(request.user).prefetch_related("charges")
        response = Response([subscription_out(s) for s in rows])
        response["Cache-Control"] = "private, no-store"
        return response


class SubscriptionAction(APIView):
    """pause and resume: staff. cancel: staff, or the client it belongs to."""

    action = ""

    def get_permissions(self):
        return [IsVerifiedUser() if self.action == "cancel" else IsStaffMember()]

    def post(self, request, pk):
        sub = services.get_visible(request.user, pk)
        getattr(services, self.action)(sub=sub, user=request.user, request=request)
        return Response(subscription_out(services.get_visible(request.user, pk)))

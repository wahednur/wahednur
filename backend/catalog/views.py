from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember, IsVerifiedUser
from core.throttling import WriteScopedThrottle

from . import services
from .serializers import OrderIn, order_out, service_out


class ServiceList(APIView):
    """Public: the price list. Read-only, no login."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request):
        data = [service_out(s) for s in services.published_services()]
        response = Response(data)
        response["Cache-Control"] = "public, max-age=60"
        return response


class ServiceDetail(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request, slug):
        return Response(service_out(services.get_service(slug)))


class OrderList(APIView):
    permission_classes = [IsVerifiedUser]
    throttle_classes = [WriteScopedThrottle]
    throttle_scope = "package-order"

    def get(self, request):
        rows = services.visible_orders(request.user)
        response = Response([order_out(o) for o in rows])
        response["Cache-Control"] = "private, no-store"
        return response

    def post(self, request):
        data = OrderIn(data=request.data)
        data.is_valid(raise_exception=True)
        order = services.place_order(user=request.user, request=request, **data.validated_data)
        return Response(order_out(order), status=status.HTTP_201_CREATED)


class OrderAction(APIView):
    """accept and decline: staff. cancel: the client who placed it."""

    action = ""

    def get_permissions(self):
        return [IsVerifiedUser() if self.action == "cancel" else IsStaffMember()]

    def post(self, request, pk):
        order = services.get_order(request.user, pk)
        if self.action == "accept":
            order = services.accept_order(order=order, user=request.user, request=request)
        else:
            new = {"decline": "declined", "cancel": "cancelled"}[self.action]
            order = services.close_order(
                order=order, status=new, user=request.user, request=request
            )
        return Response(order_out(services.get_order(request.user, pk)))

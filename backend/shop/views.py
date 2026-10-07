from rest_framework import status as http
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember, IsVerifiedUser

from . import serializers as s
from . import services


def _private(response):
    response["Cache-Control"] = "private, no-store"
    return response


class Public(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]


class ProductList(Public):
    def get(self, request):
        response = Response([s.product_out(p) for p in services.published_products()])
        response["Cache-Control"] = "public, max-age=60"
        return response


class ProductDetail(Public):
    def get(self, request, slug):
        response = Response(s.product_out(services.get_product(slug)))
        response["Cache-Control"] = "public, max-age=60"
        return response


class ZoneList(Public):
    def get(self, request):
        return Response([s.zone_out(z) for z in services.active_zones()])


class OrderList(APIView):
    permission_classes = [IsVerifiedUser]

    def get(self, request):
        return _private(Response([s.order_out(o) for o in services.visible_orders(request.user)]))

    def post(self, request):
        data = s.OrderIn(data=request.data)
        data.is_valid(raise_exception=True)
        d = data.validated_data
        order = services.create_order(
            customer=request.user,
            request=request,
            items=d["items"],
            zone=d.get("shipping_zone"),
            ship=d.get("shipping"),
            note=d.get("note", ""),
        )
        order = services.get_order(request.user, order.pk)
        return Response(s.order_out(order), status=http.HTTP_201_CREATED)


class OrderDetail(APIView):
    permission_classes = [IsVerifiedUser]

    def get(self, request, pk):
        return _private(Response(s.order_out(services.get_order(request.user, pk))))


class OrderAction(APIView):
    """claim and cancel: the customer (or staff for cancel). The rest: staff with 2FA."""

    action = ""
    STAFF = ("confirm-payment", "ship", "deliver")

    def get_permissions(self):
        return [IsStaffMember() if self.action in self.STAFF else IsVerifiedUser()]

    def post(self, request, pk):
        order = services.get_order(request.user, pk)
        user, kw = request.user, {"order": order, "request": request}
        if self.action == "claim":
            data = s.ClaimIn(data=request.data)
            data.is_valid(raise_exception=True)
            services.claim_payment(user=user, **kw, **data.validated_data)
        elif self.action == "cancel":
            services.cancel_order(user=user, **kw)
        elif self.action == "confirm-payment":
            data = s.ConfirmIn(data=request.data)
            data.is_valid(raise_exception=True)
            services.confirm_payment(user=user, **kw, **data.validated_data)
        elif self.action == "ship":
            data = s.ShipOut(data=request.data)
            data.is_valid(raise_exception=True)
            services.mark_shipped(user=user, tracking=data.validated_data.get("tracking", ""), **kw)
        else:
            services.mark_delivered(user=user, **kw)
        return Response(s.order_out(services.get_order(user, pk)))


class OrderFiles(APIView):
    permission_classes = [IsVerifiedUser]

    def get(self, request, pk):
        order = services.get_order(request.user, pk)
        links = services.download_links(order=order, user=request.user, request=request)
        return _private(Response(links))

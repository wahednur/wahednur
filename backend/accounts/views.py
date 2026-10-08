from allauth.account.models import EmailAddress
from allauth.mfa.utils import is_mfa_enabled
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class MeView(APIView):
    """Who is signed in. The Next.js server calls this (with the visitor's cookie) to decide
    what a page may show; the API still re-checks permissions on every data request."""

    permission_classes = [IsAuthenticated]
    throttle_classes: list = []

    def get(self, request):
        user = request.user
        verified = EmailAddress.objects.filter(
            user=user, email__iexact=user.email, verified=True
        ).exists()
        # Menu hints: the Shop orders and Package requests links only show when there is something behind them.
        from catalog.models import Order as PackageOrder
        from shop.models import ShopOrder

        team = user.is_staff or user.is_superuser
        shop = ShopOrder.objects.all() if team else ShopOrder.objects.filter(customer=user)
        packages = PackageOrder.objects.all() if team else PackageOrder.objects.filter(client=user)
        return Response(
            {
                "id": user.pk,
                "email": user.email,
                "full_name": user.full_name,
                "roles": user.roles,
                "email_verified": verified,
                "has_password": user.has_usable_password(),
                "mfa_enabled": is_mfa_enabled(user),
                "has_shop_orders": shop.exists(),
                "has_package_orders": packages.exists(),
            }
        )

from allauth.account.models import EmailAddress
from allauth.mfa.utils import is_mfa_enabled
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import profile
from .models import Address


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


class ProfileView(APIView):
    """Your own name, phone and company. Email and password are changed in Security."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(profile.profile_out(request.user))

    def patch(self, request):
        data = request.data
        errors = {f: "Up to 150 characters." for f in ("full_name", "company") if len(str(data.get(f, ""))) > 150}
        if len(str(data.get("phone", ""))) > 30:
            errors["phone"] = "Up to 30 characters."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(profile.update_profile(request.user, data))


class AddressListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([profile.address_out(a) for a in request.user.addresses.all()])

    def post(self, request):
        if request.user.addresses.count() >= profile.MAX_ADDRESSES:
            return Response({"detail": "You have reached the limit of saved addresses."}, status=status.HTTP_400_BAD_REQUEST)
        values, errors = profile.clean_address(request.data)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(profile.address_out(profile.save_address(request.user, values)), status=status.HTTP_201_CREATED)


class AddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk):
        return get_object_or_404(Address, pk=pk, user=request.user)  # never someone else's

    def patch(self, request, pk):
        address = self._get(request, pk)
        values, errors = profile.clean_address(request.data, partial=True)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(profile.address_out(profile.save_address(request.user, values, address)))

    def delete(self, request, pk):
        profile.delete_address(self._get(request, pk))
        return Response(status=status.HTTP_204_NO_CONTENT)

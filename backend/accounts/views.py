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
        return Response(
            {
                "id": user.pk,
                "email": user.email,
                "full_name": user.full_name,
                "roles": user.roles,
                "email_verified": verified,
                "has_password": user.has_usable_password(),
                "mfa_enabled": is_mfa_enabled(user),
            }
        )

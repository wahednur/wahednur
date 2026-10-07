from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember

from . import services
from .models import Page
from .serializers import PageIn, SeoIn, manage_out, public_out


class PublicList(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request):
        rows = services.published()
        kind = request.query_params.get("kind")
        if kind in Page.Kind.values:
            rows = rows.filter(kind=kind)
        response = Response([public_out(p, body=False) for p in rows])
        response["Cache-Control"] = "public, max-age=60"
        return response


class PublicDetail(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request, slug):
        response = Response(public_out(services.get_published(slug)))
        response["Cache-Control"] = "public, max-age=60"
        return response


class ManageList(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        return Response([manage_out(p) for p in services.manageable()])

    def post(self, request):
        data = PageIn(data=request.data)
        data.is_valid(raise_exception=True)
        page = services.save_page(user=request.user, request=request, **data.validated_data)
        return Response(manage_out(page), status=status.HTTP_201_CREATED)


class ManageDetail(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request, pk):
        return Response(manage_out(services.get_manageable(pk)))

    def put(self, request, pk):
        page = services.get_manageable(pk)
        data = PageIn(page, data=request.data)
        data.is_valid(raise_exception=True)
        page = services.save_page(
            user=request.user, page=page, request=request, **data.validated_data
        )
        return Response(manage_out(page))

    def delete(self, request, pk):
        services.delete_page(page=services.get_manageable(pk), user=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SeoManual(APIView):
    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        data = SeoIn(data=request.data)
        data.is_valid(raise_exception=True)
        page = services.set_seo_by_hand(
            page=services.get_manageable(pk),
            user=request.user,
            request=request,
            title=data.validated_data["title"],
            description=data.validated_data["description"],
        )
        return Response(manage_out(page))


class SeoAuto(APIView):
    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        page = services.unlock_seo(
            page=services.get_manageable(pk), user=request.user, request=request
        )
        return Response(manage_out(services.get_manageable(page.pk)))

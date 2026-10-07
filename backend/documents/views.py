from django.conf import settings
from django.core import signing
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember, IsVerifiedUser

from . import services
from .serializers import DocumentSerializer, SharingSerializer, UploadSerializer
from .storage import LOCAL_SALT, LocalStorage, get_storage


def _no_store(response):
    response["Cache-Control"] = "private, no-store"
    return response


class DocumentListView(APIView):
    """Staff: all documents, and upload. Clients: only what was shared with them."""

    parser_classes = [MultiPartParser]

    def get_permissions(self):
        return [IsStaffMember() if self.request.method == "POST" else IsVerifiedUser()]

    def get(self, request):
        qs = services.visible_to(request.user).select_related("client")
        return _no_store(Response(DocumentSerializer(qs, many=True).data))

    def post(self, request):
        data = UploadSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        doc = services.upload_document(user=request.user, request=request, **data.validated_data)
        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    def get_permissions(self):
        return [IsStaffMember() if self.request.method in ("PATCH", "DELETE") else IsVerifiedUser()]

    def get(self, request, pk):
        return _no_store(Response(DocumentSerializer(services.get_visible(request.user, pk)).data))

    def patch(self, request, pk):
        doc = services.get_visible(request.user, pk)
        data = SharingSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        doc = services.update_sharing(doc=doc, **data.validated_data)
        return Response(DocumentSerializer(doc).data)

    def delete(self, request, pk):
        services.delete_document(
            user=request.user, doc=services.get_visible(request.user, pk), request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentDownloadView(APIView):
    """Returns a short-lived link. Access is decided here, on every request."""

    permission_classes = [IsVerifiedUser]

    def get(self, request, pk):
        doc = services.get_visible(request.user, pk)
        return _no_store(
            Response(services.download_link(user=request.user, doc=doc, request=request))
        )


class LocalDownloadView(APIView):
    """Dev/test only: serves a file for a signed link, and only to the user it was issued to."""

    permission_classes = [IsVerifiedUser]

    def get(self, request, token):
        storage = get_storage()
        if not isinstance(storage, LocalStorage):
            raise Http404
        try:
            payload = signing.loads(token, salt=LOCAL_SALT, max_age=settings.DOCUMENTS_URL_TTL)
        except signing.BadSignature:
            raise Http404 from None
        if payload["u"] != request.user.pk:
            raise Http404
        doc = services.get_visible(request.user, payload["d"])
        response = FileResponse(
            storage.open(doc.file_key), as_attachment=True, filename=doc.original_name
        )
        response["Content-Type"] = doc.content_type
        response["X-Content-Type-Options"] = "nosniff"
        return _no_store(response)

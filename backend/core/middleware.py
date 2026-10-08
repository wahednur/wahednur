from django.conf import settings
from django.http import JsonResponse


class RequestSizeLimitMiddleware:
    """Refuse an oversized request from its headers alone, before any of it is read or saved.

    Without this a very large upload is first written to disk and only then rejected by the
    per-file check. The limit is the largest allowed file plus room for the form fields.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            size = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            size = 0
        if size > settings.MAX_REQUEST_BYTES:
            return JsonResponse({"detail": "The request is too large."}, status=413)
        return self.get_response(request)

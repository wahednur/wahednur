from rest_framework.throttling import ScopedRateThrottle


class WriteScopedThrottle(ScopedRateThrottle):
    """A per-scope limit that counts only requests which change something (POST and friends).

    Looking at a list stays free; creating orders, uploads or payment claims is limited per
    signed-in user (per address for anonymous callers), so one account cannot flood the server.
    """

    def allow_request(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return super().allow_request(request, view)

import hashlib
import hmac

from django.conf import settings


def hash_ip(ip: str) -> str:
    """Keyed hash of an IP address: lets us spot repeat abuse without storing the address."""
    if not ip:
        return ""
    return hmac.new(settings.SECRET_KEY.encode(), ip.encode(), hashlib.sha256).hexdigest()


def client_ip(request) -> str:
    """Client address, trusting exactly NUM_PROXIES reverse proxies (as DRF throttling does)."""
    proxies = settings.REST_FRAMEWORK.get("NUM_PROXIES", 0)
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if proxies and forwarded:
        addrs = [a.strip() for a in forwarded.split(",") if a.strip()]
        if len(addrs) >= proxies:
            return addrs[-proxies]
    return request.META.get("REMOTE_ADDR", "")

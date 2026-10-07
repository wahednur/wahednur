"""Container health probe. The app redirects plain HTTP to HTTPS and checks the
Host header, so the probe sends the same headers a real proxy would."""

import sys
import urllib.request

host = "localhost"  # always allowed in production, independent of ALLOWED_HOSTS
request = urllib.request.Request(
    "http://127.0.0.1:8000/api/health/",
    headers={"Host": host, "X-Forwarded-Proto": "https"},
)
try:
    with urllib.request.urlopen(request, timeout=4) as response:
        sys.exit(0 if response.status == 200 else 1)
except Exception:
    sys.exit(1)

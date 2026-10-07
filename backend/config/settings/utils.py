"""Small helpers that make environment values forgiving of common typos."""


def clean_hosts(values):
    """`"https://www.x.com, localhost"` -> `["www.x.com", "localhost"]`.
    ALLOWED_HOSTS takes bare host names: no scheme, no path, no spaces."""
    hosts = []
    for raw in values:
        host = raw.strip()
        for scheme in ("https://", "http://"):
            host = host.removeprefix(scheme)
        host = host.split("/")[0].strip()
        if host and host not in hosts:
            hosts.append(host)
    return hosts


def clean_origins(values):
    """Trim spaces and trailing slashes; CORS/CSRF origins need the scheme."""
    origins = []
    for raw in values:
        origin = raw.strip().rstrip("/")
        if origin and origin not in origins:
            origins.append(origin)
    return origins

from .base import *  # noqa: F403

# SECRET_KEY, DATABASE_URL and ALLOWED_HOSTS must be set in the environment;
# startup fails loudly if they are missing.
DEBUG = False

# The container's own health check calls the app as `localhost`.
ALLOWED_HOSTS = [*ALLOWED_HOSTS, *(h for h in ("localhost", "127.0.0.1") if h not in ALLOWED_HOSTS)]  # noqa: F405

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Without a way to send email, sign-in codes and lead notices would silently go nowhere.
if not (EMAIL_USE_SMTP or RESEND_API_KEY):  # noqa: F405
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured("Set EMAIL_HOST (SMTP) or RESEND_API_KEY so email can be sent.")

# WhiteNoise serves the Django admin's static files (right after SecurityMiddleware).
# Added here, not in base, so dev and tests do not need a collected staticfiles dir.
MIDDLEWARE = [
    MIDDLEWARE[0],  # noqa: F405
    "whitenoise.middleware.WhiteNoiseMiddleware",
    *MIDDLEWARE[1:],  # noqa: F405
]

# Hashed, compressed static files (Django admin assets) served by WhiteNoise.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

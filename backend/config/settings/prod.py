from .base import *  # noqa: F403
from .base import env

# SECRET_KEY, DATABASE_URL and ALLOWED_HOSTS must be set in the environment;
# startup fails loudly if they are missing.
DEBUG = False

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Without a key, leads would be saved but the owner would never be told.
RESEND_API_KEY = env("RESEND_API_KEY")

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

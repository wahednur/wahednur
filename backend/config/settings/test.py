from .base import *  # noqa: F403
from .base import env

SECRET_KEY = "test-only-key"
ALLOWED_HOSTS = ["testserver", "localhost"]
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CELERY_TASK_ALWAYS_EAGER = True
# Tests never reach the real Redis broker.
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"
DATABASES = {"default": env.db("DATABASE_URL")}
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_CLASSES": [],
    # High enough that ordinary tests never hit them; the throttle tests lower them on purpose.
    "DEFAULT_THROTTLE_RATES": {
        **REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],  # noqa: F405
        "shop-order": "100000/hour",
        "package-order": "100000/hour",
        "payment-claim": "100000/hour",
        "uploads": "100000/hour",
    },
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
FRONTEND_URL = "https://www.wahednur.tech"
TRUSTED_FRONTEND_ORIGINS = {FRONTEND_URL}
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]

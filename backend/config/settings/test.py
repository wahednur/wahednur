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
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
FRONTEND_URL = "https://www.wahednur.tech"
TRUSTED_FRONTEND_ORIGINS = {FRONTEND_URL}
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]

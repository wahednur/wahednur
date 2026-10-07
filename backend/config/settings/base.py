"""Settings shared by every environment. Secrets and hosts come from the
environment (see backend/.env.example); nothing secret is committed."""

from pathlib import Path

import environ

from .utils import clean_hosts, clean_origins

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")  # no-op when the file does not exist

SECRET_KEY = env("SECRET_KEY")
DEBUG = False
ALLOWED_HOSTS = clean_hosts(env.list("ALLOWED_HOSTS", default=[]))

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "core",
    "leads",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database: PostgreSQL only -------------------------------------------
DATABASES = {"default": env.db("DATABASE_URL")}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Cache and Celery both use Redis, on separate databases ---------------
REDIS_CACHE_URL = env("REDIS_CACHE_URL", default="redis://localhost:6379/1")
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_CACHE_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TIMEZONE = "Asia/Dhaka"

# --- Django REST Framework -------------------------------------------------
# Secure by default: every endpoint needs authentication unless it opts out
# with AllowAny. JSON only, and anonymous callers are rate limited.
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "60/min", "leads": "5/hour"},
    # Number of reverse proxies in front of the app (Dokploy/Traefik = 1 in prod).
    "NUM_PROXIES": env.int("NUM_PROXIES", default=0),
}

# --- CORS: only the site and the admin dashboard may call the API ----------
CORS_ALLOWED_ORIGINS = clean_origins(env.list("CORS_ALLOWED_ORIGINS", default=[]))
CSRF_TRUSTED_ORIGINS = clean_origins(env.list("CSRF_TRUSTED_ORIGINS", default=[]))

# --- Auth ------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internationalisation --------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Dhaka"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Hard to guess on purpose: the Django admin is not the owner dashboard.
ADMIN_URL = env("ADMIN_URL", default="manage-site/")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

# --- Leads: email notification through Resend ------------------------------
RESEND_API_KEY = env("RESEND_API_KEY", default="")
LEADS_NOTIFY_TO = env("LEADS_NOTIFY_TO", default="wahednur@gmail.com")
LEADS_FROM_EMAIL = env("LEADS_FROM_EMAIL", default="onboarding@resend.dev")

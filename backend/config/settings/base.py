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
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.mfa",
    "allauth.headless",
    "rest_framework",
    "corsheaders",
    "core",
    "accounts",
    "leads",
    "documents",
    "projects",
    "billing",
    "accounting",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
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
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
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
# The site sends the session cookie to the API (same site, different subdomain).
CORS_ALLOW_CREDENTIALS = True

# --- Auth ------------------------------------------------------------------
# Staff sign in with their email address. Must be set before the first migration.
AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# The Next.js site (another host than the API). allauth sends people back to it.
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000").rstrip("/")
TRUSTED_FRONTEND_ORIGINS = {FRONTEND_URL, *CORS_ALLOWED_ORIGINS}
# Any origin allowed to call the API with cookies must also pass Django's CSRF origin check,
# so it is derived from the same list (plus anything listed explicitly).
CSRF_TRUSTED_ORIGINS = clean_origins(
    [*env.list("CSRF_TRUSTED_ORIGINS", default=[]), FRONTEND_URL, *CORS_ALLOWED_ORIGINS]
)

# Cookies: HttpOnly session cookie shared by www and api (set COOKIE_DOMAIN=.wahednur.tech
# in production). The CSRF cookie must be readable by the site so it can echo it in a header.
COOKIE_DOMAIN = env("COOKIE_DOMAIN", default=None)
SESSION_COOKIE_NAME = "wn_sid"
SESSION_COOKIE_DOMAIN = COOKIE_DOMAIN
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14
CSRF_COOKIE_DOMAIN = COOKIE_DOMAIN
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False

# Two-factor authentication is required for staff and owner API access.
REQUIRE_STAFF_MFA = env.bool("REQUIRE_STAFF_MFA", default=True)

ACCOUNT_ADAPTER = "accounts.adapters.AccountAdapter"
ACCOUNT_EMAIL_SUBJECT_PREFIX = "wahednur.tech: "
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*"]
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_EMAIL_VERIFICATION_BY_CODE_ENABLED = True
ACCOUNT_PASSWORD_RESET_BY_CODE_ENABLED = True
ACCOUNT_PREVENT_ENUMERATION = True
ACCOUNT_RATE_LIMITS = {
    "login_failed": "5/5m/ip,5/5m/key",
    "signup": "10/h/ip",
    "reset_password": "5/h/ip,3/h/key",
}
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_LOGIN_ON_GET = False
SOCIALACCOUNT_STORE_TOKENS = False
# A Google sign-in joins an existing account with the same email only when Google has verified it.
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET", default="")
SOCIALACCOUNT_PROVIDERS = (
    {
        "google": {
            "APP": {"client_id": GOOGLE_CLIENT_ID, "secret": GOOGLE_CLIENT_SECRET, "key": ""},
            "SCOPE": ["profile", "email"],
            "AUTH_PARAMS": {"access_type": "online", "prompt": "select_account"},
        }
    }
    if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
    else {}
)
MFA_SUPPORTED_TYPES = ["totp", "recovery_codes"]
MFA_TOTP_ISSUER = "wahednur.tech"
HEADLESS_CLIENTS = ("browser",)
HEADLESS_SERVE_SPECIFICATION = env.bool("SERVE_API_SPEC", default=False)
HEADLESS_FRONTEND_URLS = {
    "account_signup": f"{FRONTEND_URL}/register",
    "account_confirm_email": f"{FRONTEND_URL}/verify-email/{{key}}",
    "account_reset_password": f"{FRONTEND_URL}/forgot-password",
    "account_reset_password_from_key": f"{FRONTEND_URL}/reset-password/{{key}}",
    "socialaccount_login_error": f"{FRONTEND_URL}/login?error=social",
}
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
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

# --- Email: Resend through Celery; printed to the console when no key is set --
DEFAULT_FROM_EMAIL = LEADS_FROM_EMAIL
EMAIL_BACKEND = (
    "core.mail.ResendEmailBackend"
    if RESEND_API_KEY
    else "django.core.mail.backends.console.EmailBackend"
)

# --- Cloudflare R2 -----------------------------------------------------------
# Two separate buckets and two separate tokens:
#   R2_*          public bucket (website images and assets, used from phase 8)
#   R2_PRIVATE_*  private vault (contracts, invoices). Documents use ONLY this one.
R2_ACCOUNT_ID = env("R2_ACCOUNT_ID", default="")
R2_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID", default="")
R2_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY", default="")
R2_BUCKET = env("R2_BUCKET", default="")
# Without the private keys the vault falls back to a local private folder (dev and tests only).
R2_PRIVATE_ACCOUNT_ID = env("R2_PRIVATE_ACCOUNT_ID", default="")
R2_PRIVATE_ACCESS_KEY_ID = env("R2_PRIVATE_ACCESS_KEY_ID", default="")
R2_PRIVATE_SECRET_ACCESS_KEY = env("R2_PRIVATE_SECRET_ACCESS_KEY", default="")
R2_PRIVATE_BUCKET = env("R2_PRIVATE_BUCKET", default="")
DOCUMENTS_MAX_MB = env.int("DOCUMENTS_MAX_MB", default=20)
DOCUMENTS_URL_TTL = env.int("DOCUMENTS_URL_TTL", default=300)  # seconds a download link lives
DOCUMENTS_LOCAL_ROOT = BASE_DIR / "private_media"

# --- Billing (shown on quotation and invoice PDFs) ----------------------------
BUSINESS_NAME = env("BUSINESS_NAME", default="Abdul Wahed Nur")
BUSINESS_EMAIL = env("BUSINESS_EMAIL", default="wahednur@gmail.com")
BUSINESS_ADDRESS = env("BUSINESS_ADDRESS", default="Sherpur, Bangladesh")
INVOICE_PAYMENT_NOTE = env("INVOICE_PAYMENT_NOTE", default="")  # bank / bKash / Nagad details

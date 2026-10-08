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
    "catalog",
    "subscriptions",
    "cms",
    "shop",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "core.middleware.RequestSizeLimitMiddleware",
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
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "300/min",
        "leads": "5/hour",
        # Actions that create things: per signed-in user.
        "shop-order": "20/hour",
        "package-order": "20/hour",
        "payment-claim": "20/hour",
        "uploads": "40/hour",
    },
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

# --- Email -------------------------------------------------------------------------------
# Pick ONE way to send:
#   SMTP    EMAIL_HOST (+ user and password): Gmail, Zoho, Brevo, your own mail server...
#   Resend  RESEND_API_KEY
#   neither: emails are printed to the console (development only)
# The names used in the owner's other projects work too (EMAIL_SERVER_HOST, SMTP_USER...).
RESEND_API_KEY = env("RESEND_API_KEY", default="")
EMAIL_HOST = env("EMAIL_HOST", default="") or env("EMAIL_SERVER_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=0) or env.int("EMAIL_SERVER_PORT", default=0) or 465
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="") or env("SMTP_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="") or env("SMTP_PASS", default="")
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=EMAIL_PORT == 465)  # 465 = SSL from the start
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=EMAIL_PORT == 587)  # 587 = STARTTLS
EMAIL_TIMEOUT = 10
EMAIL_FROM = env("EMAIL_FROM", default="")
# Say it outright to avoid surprises: EMAIL_PROVIDER=resend or smtp. Left empty, SMTP is used when
# EMAIL_HOST is filled, otherwise Resend when RESEND_API_KEY is filled.
EMAIL_PROVIDER = env("EMAIL_PROVIDER", default="").lower()
EMAIL_USE_SMTP = bool(EMAIL_HOST) and EMAIL_PROVIDER != "resend"

LEADS_NOTIFY_TO = env("LEADS_NOTIFY_TO", default="") or "wahednur@gmail.com"
LEADS_FROM_EMAIL = env("LEADS_FROM_EMAIL", default="") or "onboarding@resend.dev"

# The sender must be an address the mail service allows. Gmail only sends as the Gmail account.
DEFAULT_FROM_EMAIL = (
    (EMAIL_FROM or EMAIL_HOST_USER or LEADS_FROM_EMAIL) if EMAIL_USE_SMTP else LEADS_FROM_EMAIL
)
if EMAIL_USE_SMTP:
    EMAIL_BACKEND = "core.mail.SafeSMTPBackend"
elif RESEND_API_KEY:
    EMAIL_BACKEND = "core.mail.ResendEmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

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
# Biggest request body accepted at all: the largest file plus room for the form fields.
MAX_REQUEST_BYTES = (max(DOCUMENTS_MAX_MB, 5) + 2) * 1024 * 1024

# --- Billing (shown on quotation and invoice PDFs) ----------------------------
BUSINESS_NAME = env("BUSINESS_NAME", default="Abdul Wahed Nur")
BUSINESS_EMAIL = env("BUSINESS_EMAIL", default="wahednur@gmail.com")
BUSINESS_ADDRESS = env("BUSINESS_ADDRESS", default="Sherpur, Bangladesh")
INVOICE_PAYMENT_NOTE = env("INVOICE_PAYMENT_NOTE", default="")  # bank / bKash / Nagad details

# --- Scheduled jobs (run by the worker with -B) --------------------------------
CELERY_BEAT_SCHEDULE = {
    "bill-subscriptions-daily": {
        "task": "subscriptions.tasks.bill_due_subscriptions",
        "schedule": 24 * 60 * 60,
    },
}

# --- AI-assisted SEO and frontend refresh -------------------------------------
# Providers are tried in this order; with none configured (or all failing) a rule-based
# generator writes the SEO text, so SEO never depends on a paid service.
AI_PROVIDERS = env.list("AI_PROVIDERS", default=[])  # any of: anthropic, gemini, groq
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
GROQ_API_KEY = env("GROQ_API_KEY", default="")
AI_MODELS = {
    "anthropic": env("AI_MODEL_ANTHROPIC", default="claude-haiku-4-5-20251001"),
    "gemini": env("AI_MODEL_GEMINI", default="gemini-2.5-flash"),
    "groq": env("AI_MODEL_GROQ", default="llama-3.3-70b-versatile"),
}
# Shared secret the API sends to the website so it refreshes pages right after a change.
REVALIDATE_SECRET = env("REVALIDATE_SECRET", default="")

# --- Shop ---------------------------------------------------------------------------
# Unpaid orders are released (stock returns) after this many hours.
SHOP_PAYMENT_HOURS = env.int("SHOP_PAYMENT_HOURS", default=48)
CELERY_BEAT_SCHEDULE["release-unpaid-shop-orders"] = {
    "task": "shop.tasks.release_unpaid_orders",
    "schedule": 60 * 60,
}

# Public images (product photos) live in the PUBLIC bucket (R2_*). R2_PUBLIC_URL is the address that
# bucket is served from, for example https://cdn.wahednur.tech (no trailing slash).
R2_PUBLIC_URL = env("R2_PUBLIC_URL", default="").rstrip("/")
IMAGE_MAX_MB = env.int("IMAGE_MAX_MB", default=5)
IMAGES_LOCAL_ROOT = BASE_DIR / "public_media"
# Where this API is reachable (used to build photo addresses in development without R2).
API_PUBLIC_URL = env("API_PUBLIC_URL", default="http://localhost:8000").rstrip("/")

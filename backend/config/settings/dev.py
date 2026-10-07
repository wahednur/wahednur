from .base import *  # noqa: F403
from .base import env
from .utils import clean_origins

DEBUG = True
SECRET_KEY = env("SECRET_KEY", default="dev-only-insecure-key-change-me")
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://localhost:5173"],
)
TRUSTED_FRONTEND_ORIGINS = {FRONTEND_URL, *CORS_ALLOWED_ORIGINS}  # noqa: F405
CSRF_TRUSTED_ORIGINS = clean_origins([*CSRF_TRUSTED_ORIGINS, *CORS_ALLOWED_ORIGINS])  # noqa: F405

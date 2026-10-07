"""Product photos. Public by design (they appear on the website), so they use the PUBLIC bucket.

Only real raster images are accepted. SVG is refused on purpose: it can carry scripts.
"""

import uuid
from functools import lru_cache
from pathlib import Path, PurePath

from django.conf import settings
from rest_framework.exceptions import ValidationError

TYPES = {
    ".png": ("image/png", lambda b: b.startswith(b"\x89PNG\r\n\x1a\n")),
    ".jpg": ("image/jpeg", lambda b: b.startswith(b"\xff\xd8\xff")),
    ".jpeg": ("image/jpeg", lambda b: b.startswith(b"\xff\xd8\xff")),
    ".webp": ("image/webp", lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP"),
}
LOCAL_PREFIX = "/api/shop/images/"


def _public_bucket_ready() -> bool:
    return bool(
        settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET
    )


@lru_cache(maxsize=1)
def _client():
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
    )


def store_product_image(file) -> str:
    """Validate and store an uploaded photo; returns the public address to save on the product."""
    ext = PurePath(file.name.replace("\\", "/")).suffix.lower()
    if ext not in TYPES:
        raise ValidationError({"file": "Use a PNG, JPG or WEBP photo."})
    if file.size > settings.IMAGE_MAX_MB * 1024 * 1024:
        raise ValidationError({"file": f"The photo is larger than {settings.IMAGE_MAX_MB} MB."})
    data = file.read()
    content_type, looks_right = TYPES[ext]
    if not data or not looks_right(data[:16]):
        raise ValidationError({"file": "This does not look like a real photo."})

    name = f"{uuid.uuid4().hex}{'.jpg' if ext == '.jpeg' else ext}"
    if _public_bucket_ready():
        if not settings.R2_PUBLIC_URL:
            raise ValidationError({"file": "Set R2_PUBLIC_URL (the address of the public bucket)."})
        _client().put_object(
            Bucket=settings.R2_BUCKET,
            Key=f"products/{name}",
            Body=data,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",  # the name is unique forever
        )
        return f"{settings.R2_PUBLIC_URL}/products/{name}"
    # Development without R2: keep the file locally and serve it through the API.
    root = Path(settings.IMAGES_LOCAL_ROOT)
    root.mkdir(parents=True, exist_ok=True)
    (root / name).write_bytes(data)
    return f"{settings.API_PUBLIC_URL}{LOCAL_PREFIX}{name}"


def read_local_image(name: str):
    """(bytes, content_type) for a locally stored photo, or None. Only plain generated names."""
    path = Path(name)
    if path.name != name or path.suffix not in TYPES:
        return None
    file = Path(settings.IMAGES_LOCAL_ROOT) / name
    return (file.read_bytes(), TYPES[path.suffix][0]) if file.is_file() else None

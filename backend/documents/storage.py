"""Where document bytes live. Private always: nothing is ever served from a public URL.

R2 (S3 API) when keys are set; a local private folder otherwise (dev and tests only).
Callers use `get_storage()` and never import boto3 themselves.
"""

from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core import signing

LOCAL_SALT = "documents.local-download"


def _disposition(filename: str) -> str:
    return f"attachment; filename*=UTF-8''{quote(filename)}"


class R2Storage:
    def __init__(self):
        import boto3
        from botocore.config import Config

        self.bucket = settings.R2_BUCKET
        self.client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)

    def download_url(
        self, key: str, filename: str, content_type: str, *, user_id, request, doc_id
    ) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ResponseContentDisposition": _disposition(filename),
                "ResponseContentType": content_type,
            },
            ExpiresIn=settings.DOCUMENTS_URL_TTL,
        )

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)


class LocalStorage:
    """Files in a private folder, handed out through a short-lived signed API link."""

    def __init__(self):
        self.root = Path(settings.DOCUMENTS_LOCAL_ROOT)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError("bad key")
        return path

    def put(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def open(self, key: str):
        return self._path(key).open("rb")

    def download_url(
        self, key: str, filename: str, content_type: str, *, user_id, request, doc_id
    ) -> str:
        token = signing.dumps({"d": str(doc_id), "u": user_id}, salt=LOCAL_SALT)
        return request.build_absolute_uri(f"/api/documents/local/{token}/")

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


@lru_cache(maxsize=1)
def get_storage():
    if (
        settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET
    ):
        return R2Storage()
    return LocalStorage()

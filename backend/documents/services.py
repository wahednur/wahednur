"""Document rules: what may be uploaded, who may see it, how it is handed out."""

import hashlib
import uuid
from pathlib import PurePath

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record

from .models import Document
from .storage import get_storage

# extension -> (content type, magic-byte check). The browser-sent type is never trusted.
ALLOWED = {
    ".pdf": ("application/pdf", lambda b: b.startswith(b"%PDF-")),
    ".png": ("image/png", lambda b: b.startswith(b"\x89PNG\r\n\x1a\n")),
    ".jpg": ("image/jpeg", lambda b: b.startswith(b"\xff\xd8\xff")),
    ".jpeg": ("image/jpeg", lambda b: b.startswith(b"\xff\xd8\xff")),
    ".webp": ("image/webp", lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP"),
    ".docx": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        lambda b: b.startswith(b"PK\x03\x04"),
    ),
    ".xlsx": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        lambda b: b.startswith(b"PK\x03\x04"),
    ),
}


def visible_to(user):
    """Staff see everything; a client sees only their own shared documents."""
    qs = Document.objects.filter(deleted_at__isnull=True)
    if user.is_staff:
        return qs
    return qs.filter(client=user, shared_with_client=True)


def get_visible(user, doc_id) -> Document:
    try:
        return visible_to(user).get(pk=doc_id)
    except (Document.DoesNotExist, ValueError, DjangoValidationError):
        raise NotFound() from None  # same answer for "missing" and "not yours"


def _clean_name(name: str) -> str:
    base = PurePath(name.replace("\\", "/")).name.strip()
    return "".join(c for c in base if c.isprintable())[:255] or "document"


def upload_document(
    *,
    user,
    file,
    title,
    category,
    client=None,
    project=None,
    shared_with_client=False,
    request=None,
):
    name = _clean_name(file.name)
    ext = PurePath(name).suffix.lower()
    if ext not in ALLOWED:
        raise ValidationError(
            {"file": "This file type is not allowed. Use PDF, DOCX, XLSX, PNG, JPG or WEBP."}
        )
    limit = settings.DOCUMENTS_MAX_MB * 1024 * 1024
    if file.size > limit:
        raise ValidationError({"file": f"The file is larger than {settings.DOCUMENTS_MAX_MB} MB."})
    data = file.read()
    if not data:
        raise ValidationError({"file": "The file is empty."})
    content_type, looks_right = ALLOWED[ext]
    if not looks_right(data[:16]):
        raise ValidationError({"file": "The file content does not match its extension."})
    if project is not None:
        client = project.client  # a project's documents always belong to its client
    if shared_with_client and client is None:
        raise ValidationError({"shared_with_client": "Choose a client before sharing."})

    key = f"documents/{uuid.uuid4().hex}{ext}"
    get_storage().put(key, data, content_type)
    doc = Document.objects.create(
        title=title.strip(),
        category=category,
        client=client,
        project=project,
        shared_with_client=shared_with_client,
        uploaded_by=user,
        file_key=key,
        original_name=name,
        content_type=content_type,
        size=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
    )
    record("document_uploaded", request=request, user=user)
    return doc


def download_link(*, user, doc: Document, request) -> dict:
    url = get_storage().download_url(
        doc.file_key,
        doc.original_name,
        doc.content_type,
        user_id=user.pk,
        request=request,
        doc_id=doc.pk,
    )
    record("document_downloaded", request=request, user=user)
    return {"url": url, "expires_in": settings.DOCUMENTS_URL_TTL, "filename": doc.original_name}


def update_sharing(*, doc: Document, shared_with_client: bool, client=None):
    if client is not None:
        doc.client = client
    if shared_with_client and doc.client is None:
        raise ValidationError({"shared_with_client": "Choose a client before sharing."})
    doc.shared_with_client = shared_with_client
    doc.save(update_fields=["client", "shared_with_client"])
    return doc


def delete_document(*, user, doc: Document, request=None):
    doc.deleted_at = timezone.now()
    doc.save(update_fields=["deleted_at"])
    record("document_deleted", request=request, user=user)


def is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
    except ValueError:
        return False
    return True

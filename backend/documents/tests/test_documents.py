from unittest.mock import MagicMock

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import AuditEvent
from documents import storage
from documents.models import Document

User = get_user_model()
pytestmark = pytest.mark.django_db

PDF = b"%PDF-1.7\n" + b"x" * 100
URL = "/api/documents/"


@pytest.fixture(autouse=True)
def local_vault(settings, tmp_path):
    settings.DOCUMENTS_LOCAL_ROOT = tmp_path
    settings.REQUIRE_STAFF_MFA = False
    storage.get_storage.cache_clear()
    yield
    storage.get_storage.cache_clear()


def make_user(email, **extra):
    user = User.objects.create_user(email, "a-very-long-pass-123", **extra)
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    return user


def login(user):
    client = APIClient()
    client.force_login(user)
    return client


@pytest.fixture
def staff():
    return make_user("staff@example.com", is_staff=True)


@pytest.fixture
def client_user():
    return make_user("client@example.com")


def upload(api, name="mou.pdf", data=PDF, **extra):
    body = {"file": SimpleUploadedFile(name, data), "title": "MOU", "category": "mou", **extra}
    return api.post(URL, body, format="multipart")


def test_staff_uploads_and_file_lands_in_private_storage(staff, tmp_path):
    response = upload(login(staff))
    assert response.status_code == 201
    doc = Document.objects.get()
    assert doc.file_key.startswith("documents/") and doc.file_key.endswith(".pdf")
    assert (tmp_path / doc.file_key).read_bytes() == PDF
    assert doc.size == len(PDF) and len(doc.sha256) == 64
    assert "file_key" not in response.json()
    assert AuditEvent.objects.filter(action="document_uploaded").exists()


def test_anonymous_and_clients_cannot_upload(client_user):
    assert upload(APIClient()).status_code in (401, 403)
    assert upload(login(client_user)).status_code == 403
    assert Document.objects.count() == 0


def test_unverified_email_gets_nothing():
    user = User.objects.create_user("new@example.com", "a-very-long-pass-123")
    assert login(user).get(URL).status_code == 403


@pytest.mark.parametrize(
    "name,data",
    [
        ("virus.exe", b"MZ" + b"0" * 50),
        ("page.html", b"<script>alert(1)</script>"),
        ("fake.pdf", b"not really a pdf"),
        ("empty.pdf", b""),
    ],
)
def test_bad_files_are_rejected(staff, name, data):
    assert upload(login(staff), name=name, data=data).status_code == 400
    assert Document.objects.count() == 0


def test_size_limit(staff, settings):
    settings.DOCUMENTS_MAX_MB = 1
    big = b"%PDF-" + b"0" * (1024 * 1024)
    assert upload(login(staff), data=big).status_code == 400


def test_path_tricks_in_filename_never_reach_the_storage_key(staff):
    upload(login(staff), name="../../etc/passwd.pdf")
    doc = Document.objects.get()
    assert ".." not in doc.file_key and "passwd" not in doc.file_key
    assert doc.original_name == "passwd.pdf"


def test_sharing_needs_a_client(staff):
    assert upload(login(staff), shared_with_client="true").status_code == 400


def test_client_sees_only_own_shared_documents(staff, client_user):
    other = make_user("other@example.com")
    api = login(staff)
    shared = upload(api, client=client_user.pk, shared_with_client="true").json()["id"]
    private = upload(api, client=client_user.pk).json()["id"]
    theirs = upload(api, client=other.pk, shared_with_client="true").json()["id"]

    mine = login(client_user)
    ids = {d["id"] for d in mine.get(URL).json()}
    assert ids == {shared}
    assert mine.get(f"{URL}{shared}/download/").status_code == 200
    # Not shared / someone else's: indistinguishable from "does not exist".
    assert mine.get(f"{URL}{private}/download/").status_code == 404
    assert mine.get(f"{URL}{theirs}/download/").status_code == 404
    assert mine.get(f"{URL}{theirs}/").status_code == 404
    assert len({d["id"] for d in login(staff).get(URL).json()}) == 3


def test_download_link_is_short_lived_and_bound_to_the_user(staff, client_user, settings):
    doc_id = upload(login(staff), client=client_user.pk, shared_with_client="true").json()["id"]
    link = login(client_user).get(f"{URL}{doc_id}/download/").json()
    assert link["filename"] == "mou.pdf" and link["expires_in"] == settings.DOCUMENTS_URL_TTL
    path = link["url"].split("testserver")[1]

    assert login(client_user).get(path).status_code == 200
    assert login(staff).get(path).status_code == 404  # a leaked link is useless to someone else
    assert APIClient().get(path).status_code in (401, 403)
    settings.DOCUMENTS_URL_TTL = -1
    assert login(client_user).get(path).status_code == 404  # expired
    tampered = path[:-3] + "xx/"
    settings.DOCUMENTS_URL_TTL = 300
    assert login(client_user).get(tampered).status_code == 404


def test_local_file_is_served_as_attachment_without_sniffing(staff):
    doc_id = upload(login(staff)).json()["id"]
    api = login(staff)
    path = api.get(f"{URL}{doc_id}/download/").json()["url"].split("testserver")[1]
    response = api.get(path)
    assert b"".join(response.streaming_content) == PDF
    assert "attachment" in response["Content-Disposition"]
    assert response["X-Content-Type-Options"] == "nosniff"
    assert "no-store" in response["Cache-Control"]


def test_soft_delete_hides_but_keeps_the_file(staff, tmp_path):
    api = login(staff)
    doc_id = upload(api).json()["id"]
    key = Document.objects.get().file_key
    assert api.delete(f"{URL}{doc_id}/").status_code == 204
    assert api.get(f"{URL}{doc_id}/").status_code == 404
    assert (tmp_path / key).exists()
    assert Document.objects.get().deleted_at is not None


def test_clients_cannot_change_or_delete(staff, client_user):
    doc_id = upload(login(staff), client=client_user.pk, shared_with_client="true").json()["id"]
    mine = login(client_user)
    assert mine.delete(f"{URL}{doc_id}/").status_code == 403
    assert (
        mine.patch(f"{URL}{doc_id}/", {"shared_with_client": False}, format="json").status_code
        == 403
    )


def test_staff_can_stop_sharing(staff, client_user):
    api = login(staff)
    doc_id = upload(api, client=client_user.pk, shared_with_client="true").json()["id"]
    assert (
        api.patch(f"{URL}{doc_id}/", {"shared_with_client": False}, format="json").status_code
        == 200
    )
    assert login(client_user).get(URL).json() == []


def test_staff_needs_two_factor_when_required(staff, settings):
    settings.REQUIRE_STAFF_MFA = True
    assert upload(login(staff)).status_code == 403


def test_r2_storage_signs_private_links_and_uploads(settings):
    settings.R2_PRIVATE_ACCOUNT_ID, settings.R2_PRIVATE_BUCKET = "acct", "vault"
    settings.R2_PRIVATE_ACCESS_KEY_ID, settings.R2_PRIVATE_SECRET_ACCESS_KEY = "AK", "SK"
    storage.get_storage.cache_clear()
    r2 = storage.get_storage()
    assert isinstance(r2, storage.R2Storage)
    url = r2.download_url(
        "documents/a.pdf", "Contract é.pdf", "application/pdf", user_id=1, request=None, doc_id=1
    )
    assert url.startswith("https://acct.r2.cloudflarestorage.com/vault/documents/a.pdf?")
    assert "X-Amz-Signature=" in url and "X-Amz-Expires=300" in url
    assert "attachment" in url
    r2.client = MagicMock()
    r2.put("documents/a.pdf", PDF, "application/pdf")
    r2.client.put_object.assert_called_once()

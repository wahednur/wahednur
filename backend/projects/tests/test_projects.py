import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import AuditEvent
from documents import storage
from projects.models import Project

User = get_user_model()
pytestmark = pytest.mark.django_db
URL = "/api/projects/"


@pytest.fixture(autouse=True)
def _settings(settings, tmp_path):
    settings.REQUIRE_STAFF_MFA = False
    settings.DOCUMENTS_LOCAL_ROOT = tmp_path
    storage.get_storage.cache_clear()


def make_user(email, **extra):
    user = User.objects.create_user(email, "a-very-long-pass-123", **extra)
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    return user


def login(user):
    api = APIClient()
    api.force_login(user)
    return api


@pytest.fixture
def staff():
    return make_user("staff@example.com", is_staff=True)


@pytest.fixture
def alice():
    return make_user("alice@example.com")


@pytest.fixture
def bob():
    return make_user("bob@example.com")


def new_project(api, client, **extra):
    r = api.post(URL, {"title": "Shop", "client": client.pk, **extra}, format="json")
    assert r.status_code == 201, r.content
    return r.json()["id"]


def test_staff_creates_a_project_and_it_is_audited(staff, alice):
    pid = new_project(login(staff), alice)
    project = Project.objects.get(pk=pid)
    assert project.status == "proposal" and project.client == alice
    assert AuditEvent.objects.filter(action="project_created").exists()


def test_clients_cannot_create_or_change_projects(staff, alice):
    pid = new_project(login(staff), alice)
    mine = login(alice)
    assert mine.post(URL, {"title": "x", "client": alice.pk}, format="json").status_code == 403
    assert mine.patch(f"{URL}{pid}/", {"title": "x"}, format="json").status_code == 403
    assert mine.delete(f"{URL}{pid}/").status_code == 403
    assert mine.post(f"{URL}{pid}/milestones/", {"title": "x"}, format="json").status_code == 403
    assert mine.post(f"{URL}{pid}/updates/", {"message": "x"}, format="json").status_code == 403
    assert APIClient().get(URL).status_code in (401, 403)


def test_staff_without_two_factor_cannot_write(staff, alice, settings):
    settings.REQUIRE_STAFF_MFA = True
    r = login(staff).post(URL, {"title": "x", "client": alice.pk}, format="json")
    assert r.status_code == 403


def test_a_client_sees_only_their_own_projects(staff, alice, bob):
    api = login(staff)
    mine = new_project(api, alice)
    theirs = new_project(api, bob)
    client = login(alice)
    assert [p["id"] for p in client.get(URL).json()] == [mine]
    assert client.get(f"{URL}{mine}/").status_code == 200
    assert client.get(f"{URL}{theirs}/").status_code == 404
    assert len(api.get(URL).json()) == 2


def test_status_transitions(staff, alice):
    api = login(staff)
    pid = new_project(api, alice)
    patch = lambda s: api.patch(f"{URL}{pid}/", {"status": s}, format="json")  # noqa: E731
    assert patch("completed").status_code == 400  # proposal cannot jump to completed
    assert patch("active").status_code == 200
    assert patch("completed").status_code == 200
    assert Project.objects.get(pk=pid).completed_at is not None
    assert patch("active").status_code == 200  # reopen
    assert Project.objects.get(pk=pid).completed_at is None
    assert patch("cancelled").status_code == 200
    assert patch("active").status_code == 400  # cancelled is final


def test_progress_is_derived_from_milestones(staff, alice):
    api = login(staff)
    pid = new_project(api, alice)
    api.patch(f"{URL}{pid}/", {"status": "active"}, format="json")
    ids = [
        api.post(f"{URL}{pid}/milestones/", {"title": t}, format="json").json()["id"]
        for t in ("Design", "Build", "Launch", "Handover")
    ]
    assert api.get(f"{URL}{pid}/").json()["progress"] == 0
    r = api.patch(f"/api/milestones/{ids[0]}/", {"status": "done"}, format="json")
    assert r.json()["completed_at"] is not None
    assert login(alice).get(f"{URL}{pid}/").json()["progress"] == 25
    api.patch(f"/api/milestones/{ids[1]}/", {"status": "done"}, format="json")
    assert api.get(URL).json()[0]["progress"] == 50
    # Un-doing a milestone clears its completion time.
    r = api.patch(f"/api/milestones/{ids[0]}/", {"status": "todo"}, format="json")
    assert r.json()["completed_at"] is None
    assert api.get(f"{URL}{pid}/").json()["progress"] == 25


def test_closed_projects_take_no_new_milestones(staff, alice):
    api = login(staff)
    pid = new_project(api, alice)
    api.patch(f"{URL}{pid}/", {"status": "cancelled"}, format="json")
    r = api.post(f"{URL}{pid}/milestones/", {"title": "x"}, format="json")
    assert r.status_code == 400


def test_internal_notes_never_reach_the_client(staff, alice):
    api = login(staff)
    pid = new_project(api, alice)
    api.post(f"{URL}{pid}/updates/", {"message": "Design approved"}, format="json")
    api.post(
        f"{URL}{pid}/updates/",
        {"message": "Client is slow to pay", "is_public": False},
        format="json",
    )
    assert len(api.get(f"{URL}{pid}/").json()["updates"]) == 2
    seen = login(alice).get(f"{URL}{pid}/").json()["updates"]
    assert [u["message"] for u in seen] == ["Design approved"]


def test_a_client_cannot_touch_someone_elses_milestone(staff, alice, bob):
    api = login(staff)
    pid = new_project(api, alice)
    mid = api.post(f"{URL}{pid}/milestones/", {"title": "x"}, format="json").json()["id"]
    assert (
        login(bob).patch(f"/api/milestones/{mid}/", {"status": "done"}, format="json").status_code
        == 403
    )


def test_soft_deleted_projects_disappear(staff, alice):
    api = login(staff)
    pid = new_project(api, alice)
    assert api.delete(f"{URL}{pid}/").status_code == 204
    assert api.get(f"{URL}{pid}/").status_code == 404
    assert Project.objects.filter(pk=pid).exists()


def test_client_directory_is_staff_only_and_hides_nothing_else(staff, alice):
    assert login(alice).get("/api/clients/").status_code == 403
    api = login(staff)
    rows = api.get("/api/clients/?q=alice").json()
    assert [r["email"] for r in rows] == ["alice@example.com"]
    r = api.patch(
        f"/api/clients/{alice.pk}/",
        {"company": "Alice Ltd", "internal_notes": "pays late"},
        format="json",
    )
    assert r.status_code == 200
    assert api.get("/api/clients/?q=ltd").json()[0]["id"] == alice.pk


def test_project_documents_belong_to_the_projects_client(staff, alice, bob):
    api = login(staff)
    pid = new_project(api, alice)
    body = {
        "file": SimpleUploadedFile("tor.pdf", b"%PDF-1.7 x"),
        "title": "TOR",
        "category": "tor",
        "project": pid,
        "shared_with_client": "true",
    }
    r = api.post("/api/documents/", body, format="multipart")
    assert r.status_code == 201 and r.json()["client"] == alice.pk
    assert len(login(alice).get(f"/api/documents/?project={pid}").json()) == 1
    assert login(bob).get(f"/api/documents/?project={pid}").json() == []
    assert api.get("/api/documents/?project=not-a-uuid").json() == []

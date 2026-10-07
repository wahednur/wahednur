"""Project rules: status changes, milestones, progress notes, who sees what."""

from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record

from .models import Milestone, Project, ProjectUpdate

S = Project.Status
TRANSITIONS = {
    S.PROPOSAL: {S.ACTIVE, S.CANCELLED},
    S.ACTIVE: {S.ON_HOLD, S.COMPLETED, S.CANCELLED},
    S.ON_HOLD: {S.ACTIVE, S.CANCELLED},
    S.COMPLETED: {S.ACTIVE},  # reopen
    S.CANCELLED: set(),
}


def visible_to(user):
    """Staff see every project; a client sees only their own."""
    qs = Project.objects.filter(deleted_at__isnull=True, is_system=False).select_related("client")
    return qs if user.is_staff else qs.filter(client=user)


def get_visible(user, pk) -> Project:
    try:
        return visible_to(user).get(pk=pk)
    except (Project.DoesNotExist, ValueError):
        raise NotFound() from None


def create_project(*, user, request=None, **data) -> Project:
    project = Project.objects.create(**data)
    record("project_created", request=request, user=user)
    return project


def change_status(*, project: Project, status: str, user=None, request=None) -> Project:
    if status == project.status:
        return project
    if status not in TRANSITIONS[project.status]:
        raise ValidationError({"status": f"A {project.status} project cannot become {status}."})
    project.status = status
    project.completed_at = timezone.now() if status == S.COMPLETED else None
    project.save(update_fields=["status", "completed_at"])
    record("project_status", request=request, user=user)
    return project


def edit_project(*, project: Project, **data) -> Project:
    status = data.pop("status", None)
    for field, value in data.items():
        setattr(project, field, value)
    project.save()
    if status:
        change_status(project=project, status=status)
    return project


def add_milestone(*, project: Project, **data) -> Milestone:
    if project.status in (S.COMPLETED, S.CANCELLED):
        raise ValidationError({"detail": "This project is closed."})
    data.setdefault("position", project.milestones.count())
    return Milestone.objects.create(project=project, **data)


def edit_milestone(*, milestone: Milestone, **data) -> Milestone:
    for field, value in data.items():
        setattr(milestone, field, value)
    if milestone.status == Milestone.Status.DONE:
        milestone.completed_at = milestone.completed_at or timezone.now()
    else:
        milestone.completed_at = None
    milestone.save()
    return milestone


def add_update(*, project: Project, user, message: str, is_public=True) -> ProjectUpdate:
    return ProjectUpdate.objects.create(
        project=project, author=user, message=message, is_public=is_public
    )


def delete_project(*, project: Project, user, request=None):
    project.deleted_at = timezone.now()
    project.save(update_fields=["deleted_at"])
    record("project_deleted", request=request, user=user)

"""Project rules: status changes, milestones, progress notes, who sees what."""

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record

from .models import ClientProfile, Milestone, Project, ProjectUpdate

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


def _check_payment_gates(project: Project, status: str):
    """Work starts after the advance is paid; final delivery follows full payment.

    Applies only when the project already has an issued invoice, so a project without one is never
    blocked. Switch off with ENFORCE_PAYMENT_GATES=false.
    """
    if not settings.ENFORCE_PAYMENT_GATES or project.is_system:
        return
    from billing import services as billing
    from billing.models import Invoice

    invoices = Invoice.objects.filter(project=project, status=Invoice.Status.ISSUED)
    if status == S.ACTIVE and project.status == S.PROPOSAL:
        for inv in invoices:
            first = billing.schedule(inv)[:1]
            if first and first[0]["state"] != "paid":
                raise ValidationError(
                    {
                        "status": f"Work starts after the advance is paid. {inv.number}: "
                        f"'{first[0]['inst'].label}' is not paid yet."
                    }
                )
    if status == S.COMPLETED:
        for inv in invoices:
            if billing.outstanding(inv) > 0:
                raise ValidationError(
                    {
                        "status": f"Final delivery follows full payment. {inv.number} still has "
                        f"{billing.outstanding(inv)} {inv.currency} due."
                    }
                )


def change_status(*, project: Project, status: str, user=None, request=None) -> Project:
    if status == project.status:
        return project
    if status not in TRANSITIONS[project.status]:
        raise ValidationError({"status": f"A {project.status} project cannot become {status}."})
    _check_payment_gates(project, status)
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


# --- clients ---------------------------------------------------------------------
def invite_client(*, user, request=None) -> None:
    """Tell a staff-created client how to choose a password. The client sets it; we never see it."""
    send_mail(
        f"Your {settings.BUSINESS_NAME} account is ready",
        "An account has been created for you.\n\n"
        "To choose your own password:\n"
        f"1. Open {settings.FRONTEND_URL}/forgot-password\n"
        "2. Enter this email address\n"
        "3. Type the code we email you, then choose a password.\n\n"
        f"After that, sign in at {settings.FRONTEND_URL}/login to see your projects, quotations "
        "and invoices.\n\n"
        f"{settings.BUSINESS_NAME}",
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=True,
    )
    record("client_invited", request=request, user=user)


@transaction.atomic
def create_client(*, staff, email: str, client_type: str, request=None, **profile) -> ClientProfile:
    User = get_user_model()
    email = email.strip().lower()
    if User.objects.filter(email__iexact=email).exists():
        raise ValidationError({"email": "An account with this email already exists."})
    user = User(email=email)
    user.set_unusable_password()  # the client chooses it; nobody else ever knows it
    user.save()
    # Only the owner of this address can use the emailed code, so it counts as verified.
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    client = ClientProfile.objects.create(user=user, client_type=client_type, **profile)
    record("client_created", request=request, user=staff)
    transaction.on_commit(lambda: invite_client(user=user, request=request))
    return client

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember, IsVerifiedUser

from . import services
from .models import ClientProfile, Milestone
from .serializers import (
    ClientCreateSerializer,
    ClientSerializer,
    MilestoneSerializer,
    ProjectDetailSerializer,
    ProjectEditSerializer,
    ProjectSerializer,
    UpdateSerializer,
)

User = get_user_model()


def _no_store(response):
    response["Cache-Control"] = "private, no-store"
    return response


class StaffWrite:
    """Anyone verified may read what they can see; only staff (with 2FA) may change anything."""

    def get_permissions(self):
        safe = self.request.method in ("GET", "HEAD", "OPTIONS")
        return [IsVerifiedUser() if safe else IsStaffMember()]


class ProjectListView(StaffWrite, APIView):
    def get(self, request):
        qs = services.visible_to(request.user)
        return _no_store(Response(ProjectSerializer(qs, many=True).data))

    def post(self, request):
        data = ProjectSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        project = services.create_project(user=request.user, request=request, **data.validated_data)
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(StaffWrite, APIView):
    def _detail(self, request, project):
        return ProjectDetailSerializer(project, context={"request": request}).data

    def get(self, request, pk):
        project = services.get_visible(request.user, pk)
        return _no_store(Response(self._detail(request, project)))

    def patch(self, request, pk):
        project = services.get_visible(request.user, pk)
        data = ProjectEditSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        services.edit_project(project=project, **data.validated_data)
        return Response(self._detail(request, project))

    def delete(self, request, pk):
        services.delete_project(
            project=services.get_visible(request.user, pk), user=request.user, request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MilestoneListView(APIView):
    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        project = services.get_visible(request.user, pk)
        data = MilestoneSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        milestone = services.add_milestone(project=project, **data.validated_data)
        return Response(MilestoneSerializer(milestone).data, status=status.HTTP_201_CREATED)


class MilestoneDetailView(APIView):
    permission_classes = [IsStaffMember]

    def _get(self, request, pk):
        return get_object_or_404(Milestone, pk=pk, project__in=services.visible_to(request.user))

    def patch(self, request, pk):
        milestone = self._get(request, pk)
        data = MilestoneSerializer(milestone, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        milestone = services.edit_milestone(milestone=milestone, **data.validated_data)
        return Response(MilestoneSerializer(milestone).data)

    def delete(self, request, pk):
        self._get(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UpdateListView(APIView):
    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        project = services.get_visible(request.user, pk)
        data = UpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        update = services.add_update(project=project, user=request.user, **data.validated_data)
        return Response(UpdateSerializer(update).data, status=status.HTTP_201_CREATED)


class ClientListView(APIView):
    """Staff only: client accounts, with optional ?q= search on email, name or company."""

    permission_classes = [IsStaffMember]

    def post(self, request):
        data = ClientCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        profile = services.create_client(staff=request.user, request=request, **data.validated_data)
        return Response(ClientSerializer(profile).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        users = User.objects.filter(is_active=True, is_staff=False)
        q = request.query_params.get("q", "").strip()
        if q:
            users = users.filter(
                Q(email__icontains=q)
                | Q(client_profile__full_name__icontains=q)
                | Q(client_profile__company__icontains=q)
            )
        rows = [
            ClientProfile.objects.get_or_create(user=u)[0] for u in users.order_by("email")[:50]
        ]
        return _no_store(Response(ClientSerializer(rows, many=True).data))


class ClientDetailView(APIView):
    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        """Send the 'choose your password' email again."""
        user = get_object_or_404(User, pk=pk, is_staff=False)
        services.invite_client(user=user, request=request)
        return Response({"sent": True})

    def patch(self, request, pk):
        profile, _ = ClientProfile.objects.get_or_create(user=get_object_or_404(User, pk=pk))
        data = ClientSerializer(profile, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        data.save()
        return Response(data.data)

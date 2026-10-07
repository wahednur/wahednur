from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ClientProfile, Milestone, Project, ProjectUpdate

User = get_user_model()


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ["id", "title", "description", "status", "position", "due_date", "completed_at"]
        read_only_fields = ["id", "completed_at"]


class UpdateSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True, default=None)

    class Meta:
        model = ProjectUpdate
        fields = ["id", "message", "is_public", "author_email", "created_at"]
        read_only_fields = ["id", "author_email", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    client_email = serializers.EmailField(source="client.email", read_only=True)
    progress = serializers.IntegerField(read_only=True)
    client = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), required=True
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "summary",
            "status",
            "client",
            "client_email",
            "progress",
            "start_date",
            "due_date",
            "completed_at",
            "created_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at"]


class ProjectDetailSerializer(ProjectSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)
    updates = serializers.SerializerMethodField()

    class Meta(ProjectSerializer.Meta):
        fields = [*ProjectSerializer.Meta.fields, "milestones", "updates"]

    def get_updates(self, project):
        qs = project.updates.select_related("author")
        if not self.context["request"].user.is_staff:
            qs = qs.filter(is_public=True)  # internal notes never leave the server
        return UpdateSerializer(qs, many=True).data


class ProjectEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["title", "summary", "status", "start_date", "due_date"]
        extra_kwargs = {f: {"required": False} for f in fields}


class ClientSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "email", "full_name", "company", "phone", "address", "internal_notes"]

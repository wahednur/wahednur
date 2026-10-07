from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    client_email = serializers.EmailField(source="client.email", read_only=True, default=None)

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "category",
            "client",
            "client_email",
            "shared_with_client",
            "original_name",
            "content_type",
            "size",
            "created_at",
        ]
        read_only_fields = fields


class UploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    title = serializers.CharField(max_length=200)
    category = serializers.ChoiceField(
        choices=Document.Category.choices, default=Document.Category.OTHER
    )
    client = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(is_active=True), required=False, allow_null=True
    )
    shared_with_client = serializers.BooleanField(default=False)


class SharingSerializer(serializers.Serializer):
    shared_with_client = serializers.BooleanField()
    client = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(is_active=True), required=False, allow_null=True
    )

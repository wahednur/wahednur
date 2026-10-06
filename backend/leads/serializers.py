from rest_framework import serializers

from .models import Lead


class LeadSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    need = serializers.ChoiceField(choices=Lead.Need.choices)
    details = serializers.CharField(min_length=10, max_length=5000, trim_whitespace=True)
    budget = serializers.ChoiceField(choices=Lead.Budget.choices, required=False, allow_blank=True)
    timeline = serializers.ChoiceField(
        choices=Lead.Timeline.choices, required=False, allow_blank=True
    )
    # Honeypot: hidden in the form, so a real person never fills it in.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

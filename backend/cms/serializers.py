from rest_framework import serializers

from .models import Page


def clean_cover(value: str) -> str:
    """Only a path on this website or an https address. Nothing that could run code."""
    value = value.strip()
    if not value:
        return ""
    ok = (value.startswith("/") and not value.startswith("//")) or value.startswith("https://")
    if not ok or any(c in value for c in " \t\r\n\"'<>\\"):
        raise serializers.ValidationError(
            "Use a path like /blog/picture.svg or an https:// address."
        )
    return value


class PageIn(serializers.ModelSerializer):
    cover_image = serializers.CharField(max_length=300, required=False, allow_blank=True)

    class Meta:
        model = Page
        fields = ["kind", "slug", "title", "excerpt", "body", "status", "cover_image", "cover_alt"]

    def validate_cover_image(self, value):
        return clean_cover(value)


def public_out(p: Page, *, body=True):
    data = {
        "kind": p.kind,
        "slug": p.slug,
        "title": p.title,
        "excerpt": p.excerpt,
        "cover_image": p.cover_image,
        "cover_alt": p.cover_alt,
        "published_at": p.published_at,
        "updated_at": p.updated_at,
        "seo_title": p.seo_title or p.title,
        "seo_description": p.seo_description or p.excerpt,
    }
    if body:
        data["body"] = p.body
    return data


def manage_out(p: Page):
    return {
        "id": p.id,
        "kind": p.kind,
        "slug": p.slug,
        "title": p.title,
        "excerpt": p.excerpt,
        "body": p.body,
        "cover_image": p.cover_image,
        "cover_alt": p.cover_alt,
        "status": p.status,
        "published_at": p.published_at,
        "updated_at": p.updated_at,
        "seo_title": p.seo_title,
        "seo_description": p.seo_description,
        "seo_source": p.seo_source,
        "seo_locked": p.seo_locked,
        "seo_stale": p.seo_stale,
        "seo_generated_at": p.seo_generated_at,
    }


class SeoIn(serializers.Serializer):
    title = serializers.CharField(max_length=80)
    description = serializers.CharField(max_length=200)

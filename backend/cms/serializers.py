from rest_framework import serializers

from .models import Page


class PageIn(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ["kind", "slug", "title", "excerpt", "body", "status"]


def public_out(p: Page, *, body=True):
    data = {
        "kind": p.kind,
        "slug": p.slug,
        "title": p.title,
        "excerpt": p.excerpt,
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

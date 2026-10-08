import hashlib

from django.conf import settings
from django.db import models


class Page(models.Model):
    """A blog post or content page written in Markdown. SEO text is generated from the content."""

    class Kind(models.TextChoices):
        POST = "post", "Blog post"
        PAGE = "page", "Page"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    class SeoSource(models.TextChoices):
        NONE = "none", "Not generated"
        RULE = "rule", "Rule based"
        AI = "ai", "AI"
        MANUAL = "manual", "Written by hand"

    kind = models.CharField(max_length=6, choices=Kind.choices, default=Kind.POST)
    slug = models.SlugField(unique=True, max_length=120)
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=300, blank=True)
    body = models.TextField(blank=True)  # Markdown, rendered safely by the website
    # Picture that explains the post: a path on the website (/blog/x.svg) or an https address.
    cover_image = models.CharField(max_length=300, blank=True)
    cover_alt = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    seo_title = models.CharField(max_length=80, blank=True)
    seo_description = models.CharField(max_length=200, blank=True)
    seo_source = models.CharField(max_length=6, choices=SeoSource.choices, default=SeoSource.NONE)
    # Hash of the content the SEO text was made from. Content changes -> hash differs -> regenerate.
    seo_hash = models.CharField(max_length=64, blank=True)
    seo_locked = models.BooleanField(default=False)  # hand-written SEO is never overwritten
    seo_generated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        verbose_name = "blog post or page"
        verbose_name_plural = "blog posts and pages"

    def __str__(self) -> str:
        return self.title

    @property
    def content_hash(self) -> str:
        raw = f"{self.title}\n{self.excerpt}\n{self.body}"
        return hashlib.sha256(raw.encode()).hexdigest()

    @property
    def seo_stale(self) -> bool:
        return self.seo_hash != self.content_hash

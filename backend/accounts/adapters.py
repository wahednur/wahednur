from urllib.parse import urlparse

from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class AccountAdapter(DefaultAccountAdapter):
    def is_safe_url(self, url):
        """After Google sign-in allauth sends the user back to the Next.js site, which lives on
        another host than the API. Trust exactly the configured site origins, nothing else."""
        parsed = urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if parsed.netloc and origin in settings.TRUSTED_FRONTEND_ORIGINS:
            return True
        return super().is_safe_url(url)

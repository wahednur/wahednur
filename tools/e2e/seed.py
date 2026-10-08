"""Creates the accounts the browser checks sign in with, in a THROWAWAY database.

    cd backend && source .venv/bin/activate
    DATABASE_URL=postgres://.../wn_test REQUIRE_STAFF_MFA=false python manage.py migrate
    DATABASE_URL=... python manage.py shell < ../tools/e2e/seed.py

Never run this against the live database: it creates accounts with a known password.
"""

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

from projects.models import Project

U = get_user_model()
PASSWORD = "a-very-long-pass-123"


def make(email, **extra):
    user = U.objects.create_user(email, PASSWORD, **extra)
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    return user


make("boss@example.com", is_staff=True, is_superuser=True)
client = make("client@example.com")
Project.objects.create(client=client, title="Online shop", status="active")
print("seeded: boss@example.com (owner) and client@example.com")

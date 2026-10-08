import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

pytestmark = pytest.mark.django_db
User = get_user_model()


def test_a_client_may_use_ten_characters():
    validate_password("blue-tree-9", User(email="c@example.com"))  # 11 chars
    validate_password("blue-tree9")  # exactly 10, no user yet (sign-up)


def test_nine_characters_is_too_short_for_a_client():
    with pytest.raises(ValidationError):
        validate_password("blue-tre9")


def test_staff_need_twelve():
    staff = User(email="s@example.com", is_staff=True)
    with pytest.raises(ValidationError):
        validate_password("blue-tree-9", staff)  # 11
    validate_password("blue-tree-9x", staff)  # 12


def test_common_and_all_digit_passwords_are_still_refused():
    for bad in ("password1234", "1234567890123"):
        with pytest.raises(ValidationError):
            validate_password(bad)

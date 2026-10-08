"""Profile and saved addresses. Plain functions the views call."""

from django.db import transaction

from .models import Address, User

PROFILE_FIELDS = ("full_name", "phone", "company")
ADDRESS_FIELDS = (
    "kind", "label", "name", "company", "phone", "line1", "line2", "city", "region", "postal_code",
    "country", "tax_id", "is_default",
)
MAX_ADDRESSES = 20


def profile_out(user: User) -> dict:
    return {"email": user.email, **{f: getattr(user, f) for f in PROFILE_FIELDS}}


def address_out(a: Address) -> dict:
    return {"id": a.id, **{f: getattr(a, f) for f in ADDRESS_FIELDS}}


def update_profile(user: User, data: dict) -> dict:
    for f in PROFILE_FIELDS:
        if f in data:
            setattr(user, f, str(data[f]).strip()[: User._meta.get_field(f).max_length])
    user.save(update_fields=[f for f in PROFILE_FIELDS if f in data] or None)
    return profile_out(user)


def clean_address(data: dict, *, partial: bool = False) -> tuple[dict, dict]:
    """Return (clean values, errors). Strings are trimmed and length checked."""
    out, errors = {}, {}
    for f in ADDRESS_FIELDS:
        if f not in data:
            continue
        if f == "is_default":
            out[f] = bool(data[f])
            continue
        value = str(data[f]).strip()
        if f == "kind":
            if value not in Address.Kind.values:
                errors[f] = "Choose delivery or billing."
                continue
        else:
            limit = Address._meta.get_field(f).max_length
            if len(value) > limit:
                errors[f] = f"Up to {limit} characters."
                continue
        out[f] = value
    if not partial:
        for f in ("name", "line1", "city"):
            if not out.get(f):
                errors[f] = "This is required."
    else:
        for f in ("name", "line1", "city"):
            if f in out and not out[f]:
                errors[f] = "This is required."
    return out, errors


@transaction.atomic
def save_address(user: User, values: dict, address: Address | None = None) -> Address:
    kind = values.get("kind") or (address.kind if address else Address.Kind.SHIPPING)
    mine = Address.objects.filter(user=user, kind=kind)
    if address is None:
        address = Address(user=user)
        # The first address of a kind becomes its default.
        if not mine.exists():
            values = {**values, "is_default": True}
    for f, v in values.items():
        setattr(address, f, v)
    if address.is_default:
        mine.exclude(pk=address.pk).update(is_default=False)
    address.save()
    return address


@transaction.atomic
def delete_address(address: Address) -> None:
    user, kind, was_default = address.user, address.kind, address.is_default
    address.delete()
    if was_default:
        nxt = Address.objects.filter(user=user, kind=kind).first()
        if nxt:
            nxt.is_default = True
            nxt.save(update_fields=["is_default"])

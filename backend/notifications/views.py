from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember, IsVerifiedUser

from . import push, services
from .models import Message, Notification, PushSubscription

User = get_user_model()


def _no_store(r):
    r["Cache-Control"] = "private, no-store"
    return r


def note_out(n: Notification) -> dict:
    return {"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "url": n.url, "created_at": n.created_at, "read": n.read_at is not None}


class NotificationList(APIView):
    permission_classes = [IsVerifiedUser]

    def get(self, request):
        try:
            limit = min(int(request.query_params.get("limit", 30)), 100)
        except ValueError:
            limit = 30
        rows = Notification.objects.filter(user=request.user)[:limit]
        return _no_store(Response({"unread": services.unread_count(request.user), "items": [note_out(n) for n in rows]}))


class UnreadCount(APIView):
    """Cheap, for the bell. Notifications and unread messages in one small answer."""

    permission_classes = [IsVerifiedUser]
    throttle_classes: list = []

    def get(self, request):
        unread_messages = Message.objects.filter(customer=request.user, from_team=True, read_at__isnull=True).count()
        return _no_store(Response({"unread": services.unread_count(request.user), "messages": unread_messages}))


class MarkRead(APIView):
    permission_classes = [IsVerifiedUser]

    def post(self, request):
        ids = request.data.get("ids")
        if ids is not None and not (isinstance(ids, list) and all(isinstance(i, int) for i in ids)):
            raise ValidationError({"ids": "Send a list of ids."})
        services.mark_read(request.user, ids)
        return Response({"unread": services.unread_count(request.user)})


class SettingsView(APIView):
    permission_classes = [IsVerifiedUser]

    def _out(self, user):
        s = services.settings_for(user)
        return {"email": s.email, "push": s.push, "push_available": push.enabled(), "devices": user.push_subscriptions.count()}

    def get(self, request):
        return Response(self._out(request.user))

    def patch(self, request):
        s = services.settings_for(request.user)
        for f in ("email", "push"):
            if f in request.data:
                setattr(s, f, bool(request.data[f]))
        s.save()
        return Response(self._out(request.user))


class PushKey(APIView):
    permission_classes = [IsVerifiedUser]

    def get(self, request):
        return Response({"key": settings.VAPID_PUBLIC_KEY if push.enabled() else ""})


class PushSubscribe(APIView):
    permission_classes = [IsVerifiedUser]

    def post(self, request):
        d = request.data
        keys = d.get("keys") or {}
        endpoint, p256dh, auth = d.get("endpoint"), keys.get("p256dh"), keys.get("auth")
        if not (isinstance(endpoint, str) and endpoint.startswith("https://") and p256dh and auth) or len(endpoint) > 1000:
            raise ValidationError({"detail": "That is not a valid push subscription."})
        PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={"user": request.user, "p256dh": str(p256dh)[:200], "auth": str(auth)[:100], "user_agent": request.headers.get("User-Agent", "")[:200]},
        )
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request):
        PushSubscription.objects.filter(user=request.user, endpoint=request.data.get("endpoint", "")).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def msg_out(m: Message) -> dict:
    return {"id": m.id, "body": m.body, "from_team": m.from_team, "created_at": m.created_at, "read": m.read_at is not None}


class MyThread(APIView):
    """The signed-in customer's conversation with me."""

    permission_classes = [IsVerifiedUser]

    def get(self, request):
        rows = list(Message.objects.filter(customer=request.user).order_by("-created_at")[:200])[::-1]
        services.mark_thread_read(customer=request.user, reader=request.user)
        return _no_store(Response([msg_out(m) for m in rows]))

    def post(self, request):
        body = str(request.data.get("body", "")).strip()
        if not body or len(body) > 4000:
            raise ValidationError({"body": "Write a message, up to 4,000 characters."})
        return Response(msg_out(services.post_message(customer=request.user, sender=request.user, body=body)), status=status.HTTP_201_CREATED)


class Conversations(APIView):
    """Staff: everyone who has written, newest first, with how many of their messages are unread."""

    permission_classes = [IsStaffMember]

    def get(self, request):
        rows = (
            Message.objects.values("customer")
            .annotate(last=Max("created_at"), unread=Count("id", filter=Q(from_team=False, read_at__isnull=True)))
            .order_by("-last")[:100]
        )
        users = User.objects.in_bulk([r["customer"] for r in rows])
        return _no_store(Response([
            {"customer": r["customer"], "email": users[r["customer"]].email, "name": users[r["customer"]].full_name, "last": r["last"], "unread": r["unread"]}
            for r in rows
        ]))


class ThreadWith(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request, customer):
        user = get_object_or_404(User, pk=customer)
        rows = list(Message.objects.filter(customer=user).order_by("-created_at")[:200])[::-1]
        services.mark_thread_read(customer=user, reader=request.user)
        return _no_store(Response({"email": user.email, "name": user.full_name, "messages": [msg_out(m) for m in rows]}))

    def post(self, request, customer):
        user = get_object_or_404(User, pk=customer, is_active=True)
        body = str(request.data.get("body", "")).strip()
        if not body or len(body) > 4000:
            raise ValidationError({"body": "Write a message, up to 4,000 characters."})
        return Response(msg_out(services.post_message(customer=user, sender=request.user, body=body)), status=status.HTTP_201_CREATED)

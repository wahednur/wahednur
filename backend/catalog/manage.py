"""Staff screens for the price list: every service and package, published or not."""

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember
from accounts.signals import record

from . import services
from .models import Package, Service


class PackageSerializer(serializers.ModelSerializer):
    features = serializers.ListField(
        child=serializers.CharField(max_length=120), max_length=12, required=False
    )

    class Meta:
        model = Package
        fields = [
            "id",
            "name",
            "tagline",
            "features",
            "price",
            "currency",
            "cycle",
            "delivery_days",
            "revisions",
            "position",
            "published",
        ]
        read_only_fields = ["id"]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("The price must be above zero.")
        return value


class ServiceSerializer(serializers.ModelSerializer):
    packages = PackageSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = [
            "id",
            "slug",
            "title",
            "summary",
            "description",
            "position",
            "published",
            "packages",
        ]
        read_only_fields = ["id"]


class ServiceList(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        rows = Service.objects.prefetch_related("packages")
        return Response(ServiceSerializer(rows, many=True).data)

    def post(self, request):
        data = ServiceSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        data.save()
        record("service_saved", request=request, user=request.user)
        return Response(data.data, status=status.HTTP_201_CREATED)


class ServiceDetail(APIView):
    permission_classes = [IsStaffMember]

    def put(self, request, pk):
        service = get_object_or_404(Service, pk=pk)
        data = ServiceSerializer(service, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        data.save()
        record("service_saved", request=request, user=request.user)
        return Response(ServiceSerializer(Service.objects.get(pk=pk)).data)

    def delete(self, request, pk):
        services.delete_service(
            service=get_object_or_404(Service, pk=pk), user=request.user, request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PackageList(APIView):
    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        service = get_object_or_404(Service, pk=pk)
        data = PackageSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        data.save(service=service)
        record("package_saved", request=request, user=request.user)
        return Response(data.data, status=status.HTTP_201_CREATED)


class PackageDetail(APIView):
    permission_classes = [IsStaffMember]

    def put(self, request, pk):
        package = get_object_or_404(Package, pk=pk)
        data = PackageSerializer(package, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        data.save()
        record("package_saved", request=request, user=request.user)
        return Response(data.data)

    def delete(self, request, pk):
        services.delete_package(
            package=get_object_or_404(Package, pk=pk), user=request.user, request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

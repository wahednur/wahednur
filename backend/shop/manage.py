"""Staff screens for the shop: products (with stock and files) and delivery areas."""

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember
from accounts.signals import record

from . import services
from .models import Product, ShippingZone


class ProductSerializer(serializers.ModelSerializer):
    stock = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "title",
            "summary",
            "description",
            "kind",
            "price",
            "currency",
            "image_url",
            "published",
            "position",
            "stock",
            "files",
        ]
        read_only_fields = ["id", "stock", "files"]

    def get_stock(self, product):
        return product.stock

    def get_files(self, product):
        return [
            {
                "document": str(f.document_id),
                "title": f.document.title,
                "name": f.document.original_name,
            }
            for f in product.files.select_related("document")
        ]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("The price must be above zero.")
        return value

    def validate(self, attrs):
        # What a product is cannot change once it exists: stock, files and orders depend on it.
        if self.instance and "kind" in attrs and attrs["kind"] != self.instance.kind:
            raise serializers.ValidationError({"kind": "The type of a product cannot be changed."})
        return attrs


class StockIn(serializers.Serializer):
    delta = serializers.IntegerField(min_value=-100000, max_value=100000)
    reason = serializers.ChoiceField(choices=["restock", "adjustment"])
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)


class FileIn(serializers.Serializer):
    document = serializers.UUIDField()


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingZone
        fields = ["id", "name", "fee", "currency", "active", "position"]
        read_only_fields = ["id"]

    def validate_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("The fee cannot be negative.")
        return value


class ProductList(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        rows = Product.objects.prefetch_related("files__document")
        return Response(ProductSerializer(rows, many=True).data)

    def post(self, request):
        data = ProductSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        if data.validated_data.get("published"):
            # A new download product has no file yet, so it must start hidden.
            services.check_can_publish(Product(kind=data.validated_data["kind"]))
        product = data.save()
        record("product_saved", request=request, user=request.user)
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


class ProductDetail(APIView):
    permission_classes = [IsStaffMember]

    def put(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        data = ProductSerializer(product, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        if data.validated_data.get("published"):
            services.check_can_publish(product)
        data.save()
        record("product_saved", request=request, user=request.user)
        return Response(ProductSerializer(Product.objects.get(pk=pk)).data)

    def delete(self, request, pk):
        services.delete_product(
            product=get_object_or_404(Product, pk=pk), user=request.user, request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductStock(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        rows = product.movements.select_related("created_by")[:30]
        return Response(
            [
                {
                    "id": m.id,
                    "delta": m.delta,
                    "reason": m.reason,
                    "note": m.note,
                    "by": m.created_by.email if m.created_by else None,
                    "at": m.created_at,
                }
                for m in rows
            ]
        )

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        data = StockIn(data=request.data)
        data.is_valid(raise_exception=True)
        services.adjust_stock(
            product=product,
            user=request.user,
            request=request,
            note=data.validated_data.get("note", ""),
            delta=data.validated_data["delta"],
            reason=data.validated_data["reason"],
        )
        return Response(
            ProductSerializer(Product.objects.get(pk=pk)).data, status=status.HTTP_201_CREATED
        )


class ProductFiles(APIView):
    permission_classes = [IsStaffMember]

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        data = FileIn(data=request.data)
        data.is_valid(raise_exception=True)
        services.attach_file(
            product=product,
            document_id=data.validated_data["document"],
            user=request.user,
            request=request,
        )
        return Response(
            ProductSerializer(Product.objects.get(pk=pk)).data, status=status.HTTP_201_CREATED
        )


class ProductFileDetail(APIView):
    permission_classes = [IsStaffMember]

    def delete(self, request, pk, document):
        product = get_object_or_404(Product, pk=pk)
        services.detach_file(
            product=product, document_id=document, user=request.user, request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ZoneList(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        return Response(ZoneSerializer(ShippingZone.objects.all(), many=True).data)

    def post(self, request):
        data = ZoneSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        data.save()
        record("zone_saved", request=request, user=request.user)
        return Response(data.data, status=status.HTTP_201_CREATED)


class ZoneDetail(APIView):
    permission_classes = [IsStaffMember]

    def put(self, request, pk):
        zone = get_object_or_404(ShippingZone, pk=pk)
        data = ZoneSerializer(zone, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        data.save()
        record("zone_saved", request=request, user=request.user)
        return Response(data.data)

    def delete(self, request, pk):
        services.delete_zone(
            zone=get_object_or_404(ShippingZone, pk=pk), user=request.user, request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

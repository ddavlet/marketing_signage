import uuid

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdminOrManager

from .models import Device
from .serializers import DeviceDetailSerializer, DeviceSerializer


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.select_related("location", "assigned_playlist", "registered_by")
    permission_classes = [IsAdminOrManager]

    def get_serializer_class(self):
        if self.action == "create":
            return DeviceDetailSerializer
        return DeviceSerializer

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="regenerate-key")
    def regenerate_key(self, request, pk=None):
        device = self.get_object()
        device.api_key = uuid.uuid4()
        device.save(update_fields=["api_key"])
        return Response(DeviceDetailSerializer(device).data, status=status.HTTP_200_OK)

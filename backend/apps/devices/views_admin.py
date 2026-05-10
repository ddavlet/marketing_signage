import uuid

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdminOrManager

from .models import Device, DeviceCommand
from .serializers import (
    ApproveDeviceSerializer,
    DeviceDetailSerializer,
    DeviceSerializer,
    PendingDeviceSerializer,
)


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.select_related("location", "assigned_playlist", "registered_by")
    permission_classes = [IsAdminOrManager]

    def get_queryset(self):
        qs = self.queryset
        if self.action == "list":
            # Hide pending devices from the main Devices page; they show up
            # under /pending/ instead.
            qs = qs.filter(is_approved=True)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return DeviceDetailSerializer
        if self.action == "pending":
            return PendingDeviceSerializer
        if self.action == "approve":
            return ApproveDeviceSerializer
        return DeviceSerializer

    def perform_create(self, serializer):
        # Manually-created devices (admin clicks "Add device" in panel) are
        # immediately approved — auto-registered devices come in via the
        # open /api/device/register/ endpoint with is_approved=False.
        serializer.save(registered_by=self.request.user, is_approved=True)

    @action(detail=True, methods=["post"], url_path="regenerate-key")
    def regenerate_key(self, request, pk=None):
        device = self.get_object()
        device.api_key = uuid.uuid4()
        device.save(update_fields=["api_key"])
        return Response(DeviceDetailSerializer(device).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        """List devices awaiting admin approval (auto-registered, unapproved)."""
        queryset = self.get_queryset().filter(is_approved=False)
        serializer = PendingDeviceSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="send-command")
    def send_command(self, request, pk=None):
        """Queue a command for the device agent to pick up on next heartbeat."""
        device = self.get_object()
        kind = (request.data.get("kind") or "").strip()
        if kind not in dict(DeviceCommand.KINDS):
            return Response({"detail": "Invalid command kind."}, status=status.HTTP_400_BAD_REQUEST)
        payload = request.data.get("payload", {})
        if not isinstance(payload, dict):
            payload = {}
        cmd = DeviceCommand.objects.create(device=device, kind=kind, payload=payload)
        return Response({"id": cmd.pk, "kind": cmd.kind}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Approve a pending device and (optionally) assign location + playlist."""
        device = self.get_object()
        serializer = ApproveDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        location = serializer.validated_data.get("location")
        playlist = serializer.validated_data.get("assigned_playlist")

        device.is_approved = True
        if "location" in serializer.validated_data:
            device.location = location
        if "assigned_playlist" in serializer.validated_data:
            device.assigned_playlist = playlist
        device.save()

        return Response(DeviceSerializer(device).data, status=status.HTTP_200_OK)

from rest_framework import serializers

from .models import Device


class DeviceSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Device
        fields = [
            "id", "name", "location", "assigned_playlist",
            "status", "last_seen", "registered_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "api_key", "status", "last_seen", "registered_by", "created_at", "updated_at"]


class DeviceDetailSerializer(DeviceSerializer):
    """Includes api_key — returned only on create and regenerate-key."""

    class Meta(DeviceSerializer.Meta):
        fields = DeviceSerializer.Meta.fields + ["api_key"]

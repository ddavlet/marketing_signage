from rest_framework import serializers

from apps.locations.models import Location
from apps.playlists.models import Playlist

from .models import Device


PLAYER_FIELDS = [
    "is_approved",
    "hardware_id",
    "sync_interval_seconds",
    "update_channel",
    "screen_on_time",
    "screen_off_time",
    "timezone",
    "player_version",
    "os_info",
]


class DeviceSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Device
        fields = [
            "id", "name", "location", "assigned_playlist",
            "status", "last_seen", "registered_by",
            "created_at", "updated_at",
        ] + PLAYER_FIELDS
        read_only_fields = [
            "id", "api_key", "status", "last_seen", "registered_by",
            "created_at", "updated_at",
            # set by the device, not the admin:
            "hardware_id", "player_version", "os_info",
        ]


class DeviceDetailSerializer(DeviceSerializer):
    """Includes api_key — returned only on create and regenerate-key."""

    class Meta(DeviceSerializer.Meta):
        fields = DeviceSerializer.Meta.fields + ["api_key"]


class PendingDeviceSerializer(serializers.ModelSerializer):
    """Compact view used by the Pending Devices admin page."""

    class Meta:
        model = Device
        fields = [
            "id", "name", "hardware_id", "player_version", "os_info",
            "created_at", "updated_at", "last_seen",
        ]
        read_only_fields = fields


class ApproveDeviceSerializer(serializers.Serializer):
    location = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        required=False,
        allow_null=True,
    )
    assigned_playlist = serializers.PrimaryKeyRelatedField(
        queryset=Playlist.objects.all(),
        required=False,
        allow_null=True,
    )

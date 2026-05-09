from django.utils.timezone import now
from rest_framework import serializers

from .models import PlayEvent


class PlayEventIngestSerializer(serializers.Serializer):
    """Single play event from the device player."""
    media_id = serializers.IntegerField()
    playlist_id = serializers.IntegerField(required=False, allow_null=True)
    duration_seconds = serializers.IntegerField(min_value=1)
    # Client-side timestamp (ms since epoch); falls back to server time if missing
    ts = serializers.IntegerField(required=False, allow_null=True)


class PlayEventBatchSerializer(serializers.Serializer):
    events = PlayEventIngestSerializer(many=True)


class PlayEventSerializer(serializers.ModelSerializer):
    media_name = serializers.CharField(source="media.name", read_only=True)
    device_name = serializers.CharField(source="device.name", read_only=True)
    playlist_name = serializers.CharField(source="playlist.name", read_only=True, allow_null=True)

    class Meta:
        model = PlayEvent
        fields = ["id", "device", "device_name", "media", "media_name",
                  "playlist", "playlist_name", "played_at", "duration_seconds"]

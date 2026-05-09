from rest_framework import serializers

from apps.media_library.serializers import MediaSerializer

from .models import Playlist, PlaylistItem, PlaylistType


class PlaylistItemSerializer(serializers.ModelSerializer):
    media_detail = MediaSerializer(source="media", read_only=True)

    class Meta:
        model = PlaylistItem
        fields = ["id", "media", "media_detail", "order", "duration_seconds"]


class PlaylistItemWriteSerializer(serializers.Serializer):
    media = serializers.IntegerField()
    duration_seconds = serializers.IntegerField(required=False, allow_null=True, min_value=1)


class PlaylistSerializer(serializers.ModelSerializer):
    items = PlaylistItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Playlist
        fields = [
            "id", "name", "description", "type", "external_url",
            "is_active", "version", "item_count", "items",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "version", "created_by", "created_at", "updated_at"]

    def validate(self, data):
        if data.get("type") == PlaylistType.EXTERNAL_URL and not data.get("external_url"):
            raise serializers.ValidationError({"external_url": "Required when type is external_url."})
        return data

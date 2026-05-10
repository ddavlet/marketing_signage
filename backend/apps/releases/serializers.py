from rest_framework import serializers

from .models import Release


class ReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Release
        fields = [
            "id", "version", "channel", "os", "arch",
            "download_url", "sha256", "signature", "notes",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

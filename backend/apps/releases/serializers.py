from rest_framework import serializers

from .models import Release


class ReleaseSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Release
        fields = [
            "id", "version", "channel", "os", "arch",
            "binary", "download_url", "sha256", "signature", "notes",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at", "download_url"]

    def get_download_url(self, obj):
        if obj.binary:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.binary.url)
            return obj.binary.url
        return obj.download_url

import hashlib

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
        read_only_fields = ["id", "created_at", "download_url", "sha256"]

    def get_download_url(self, obj):
        if obj.binary:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.binary.url)
            return obj.binary.url
        return obj.download_url

    def _compute_sha256(self, binary_file):
        binary_file.seek(0)
        sha = hashlib.sha256(binary_file.read()).hexdigest()
        binary_file.seek(0)
        return sha

    def create(self, validated_data):
        if "binary" in validated_data and validated_data["binary"]:
            validated_data["sha256"] = self._compute_sha256(validated_data["binary"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "binary" in validated_data and validated_data["binary"]:
            validated_data["sha256"] = self._compute_sha256(validated_data["binary"])
        return super().update(instance, validated_data)

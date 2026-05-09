from rest_framework import serializers

from .models import Media, MediaType

ALLOWED_MIME_TYPES = {
    "image/jpeg": MediaType.IMAGE,
    "image/png": MediaType.IMAGE,
    "image/gif": MediaType.IMAGE,
    "image/webp": MediaType.IMAGE,
    "video/mp4": MediaType.VIDEO,
    "video/webm": MediaType.VIDEO,
}

MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB
IMAGE_DEFAULT_DURATION = 10


class MediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = [
            "id", "name", "file_url", "media_type",
            "duration_seconds", "file_size", "mime_type",
            "uploaded_by", "uploaded_at",
        ]
        read_only_fields = ["id", "media_type", "file_size", "mime_type", "uploaded_by", "uploaded_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class MediaUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField()

    class Meta:
        model = Media
        fields = ["name", "file"]

    def validate_file(self, file):
        mime = file.content_type
        if mime not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                f"Unsupported file type '{mime}'. Allowed: {', '.join(ALLOWED_MIME_TYPES)}."
            )
        if file.size > MAX_FILE_SIZE:
            raise serializers.ValidationError("File exceeds the 200 MB limit.")
        return file

    def create(self, validated_data):
        file = validated_data["file"]
        mime = file.content_type
        media_type = ALLOWED_MIME_TYPES[mime]
        duration = IMAGE_DEFAULT_DURATION if media_type == MediaType.IMAGE else None
        return Media.objects.create(
            name=validated_data.get("name") or file.name,
            file=file,
            media_type=media_type,
            duration_seconds=duration,
            file_size=file.size,
            mime_type=mime,
            uploaded_by=self.context["request"].user,
        )

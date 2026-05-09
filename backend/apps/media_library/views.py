from rest_framework import mixins, serializers, viewsets
from rest_framework.parsers import JSONParser, MultiPartParser

from apps.users.permissions import IsAdminOrManagerOrReadOnly

from .models import Media
from .serializers import MediaSerializer, MediaUploadSerializer


class MediaRenameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = ["name"]


class MediaViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Media.objects.select_related("uploaded_by")
    permission_classes = [IsAdminOrManagerOrReadOnly]
    # Both parsers present; DRF selects by Content-Type.
    # MultiPartParser handles file uploads; JSONParser handles rename PATCH.
    parser_classes = [MultiPartParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return MediaUploadSerializer
        if self.action in ("update", "partial_update"):
            return MediaRenameSerializer
        return MediaSerializer

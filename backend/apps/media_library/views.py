from rest_framework import mixins, viewsets
from rest_framework.parsers import MultiPartParser

from apps.users.permissions import IsAdminOrManagerOrReadOnly

from .models import Media
from .serializers import MediaSerializer, MediaUploadSerializer


class MediaViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Media.objects.select_related("uploaded_by")
    permission_classes = [IsAdminOrManagerOrReadOnly]
    parser_classes = [MultiPartParser]

    def get_serializer_class(self):
        if self.action == "create":
            return MediaUploadSerializer
        return MediaSerializer

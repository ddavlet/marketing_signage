from django.db import transaction
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.media_library.models import Media
from apps.users.permissions import IsAdminOrManagerOrReadOnly

from .models import Playlist, PlaylistItem
from .serializers import PlaylistItemWriteSerializer, PlaylistSerializer


class PlaylistViewSet(viewsets.ModelViewSet):
    queryset = Playlist.objects.prefetch_related("items__media").select_related("created_by")
    serializer_class = PlaylistSerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["put"], url_path="items")
    def set_items(self, request, pk=None):
        """Replace the full item list for a playlist."""
        playlist = self.get_object()
        items_data = request.data if isinstance(request.data, list) else []
        serializer = PlaylistItemWriteSerializer(data=items_data, many=True)
        serializer.is_valid(raise_exception=True)

        media_ids = [d["media"] for d in serializer.validated_data]
        found = Media.objects.filter(pk__in=media_ids).values_list("pk", flat=True)
        missing = set(media_ids) - set(found)
        if missing:
            raise drf_serializers.ValidationError({"media": f"Unknown media IDs: {sorted(missing)}"})

        with transaction.atomic():
            playlist.items.all().delete()
            PlaylistItem.objects.bulk_create([
                PlaylistItem(
                    playlist=playlist,
                    media_id=d["media"],
                    order=idx,
                    duration_seconds=d.get("duration_seconds"),
                )
                for idx, d in enumerate(serializer.validated_data)
            ])
            playlist.bump_version()

        playlist.refresh_from_db()
        return Response(PlaylistSerializer(playlist, context={"request": request}).data)

    @action(detail=True, methods=["patch"], url_path="reorder")
    def reorder(self, request, pk=None):
        """Reorder items by providing a list of PlaylistItem IDs in the desired order."""
        playlist = self.get_object()
        item_ids = request.data.get("order", [])
        if not isinstance(item_ids, list):
            raise drf_serializers.ValidationError({"order": "Must be a list of item IDs."})

        items = {item.pk: item for item in playlist.items.all()}
        if set(item_ids) != set(items.keys()):
            raise drf_serializers.ValidationError({"order": "Provided IDs do not match current item IDs."})

        with transaction.atomic():
            for new_order, item_id in enumerate(item_ids):
                items[item_id].order = new_order
                items[item_id].save(update_fields=["order"])
            playlist.bump_version()

        playlist.refresh_from_db()
        return Response(PlaylistSerializer(playlist, context={"request": request}).data)

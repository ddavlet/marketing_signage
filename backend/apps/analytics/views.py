from datetime import datetime, timezone

from django.db.models import Count, Sum
from django.utils.timezone import now
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.devices.auth import DeviceKeyAuthentication
from apps.media_library.models import Media
from apps.devices.models import Device

from .models import PlayEvent
from .serializers import PlayEventBatchSerializer, PlayEventSerializer


class PlayEventIngestView(APIView):
    """Called by the device player — accepts a batch of buffered play events."""
    authentication_classes = [DeviceKeyAuthentication]
    permission_classes = []

    def post(self, request):
        device = request.user
        if not isinstance(device, Device):
            return Response({"detail": "Device auth required."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = PlayEventBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        events = []
        for ev in serializer.validated_data["events"]:
            try:
                media = Media.objects.get(pk=ev["media_id"])
            except Media.DoesNotExist:
                continue

            played_at = (
                datetime.fromtimestamp(ev["ts"] / 1000, tz=timezone.utc)
                if ev.get("ts")
                else now()
            )
            events.append(PlayEvent(
                device=device,
                media=media,
                playlist_id=ev.get("playlist_id"),
                played_at=played_at,
                duration_seconds=ev["duration_seconds"],
            ))

        PlayEvent.objects.bulk_create(events)
        return Response({"created": len(events)}, status=status.HTTP_201_CREATED)


class PlayEventListView(generics.ListAPIView):
    serializer_class = PlayEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PlayEvent.objects.select_related("device", "media", "playlist")
        if device_id := self.request.query_params.get("device"):
            qs = qs.filter(device_id=device_id)
        if media_id := self.request.query_params.get("media"):
            qs = qs.filter(media_id=media_id)
        if since := self.request.query_params.get("since"):
            qs = qs.filter(played_at__gte=since)
        if until := self.request.query_params.get("until"):
            qs = qs.filter(played_at__lte=until)
        return qs[:500]


class AnalyticsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        since = request.query_params.get("since")
        qs = PlayEvent.objects.all()
        if since:
            qs = qs.filter(played_at__gte=since)

        total_plays = qs.count()
        total_duration = qs.aggregate(s=Sum("duration_seconds"))["s"] or 0

        top_media = (
            qs.values("media__id", "media__name")
            .annotate(plays=Count("id"), seconds=Sum("duration_seconds"))
            .order_by("-plays")[:10]
        )

        by_device = (
            qs.values("device__id", "device__name")
            .annotate(plays=Count("id"), seconds=Sum("duration_seconds"))
            .order_by("-plays")
        )

        return Response({
            "total_plays": total_plays,
            "total_duration_seconds": total_duration,
            "top_media": list(top_media),
            "by_device": list(by_device),
        })

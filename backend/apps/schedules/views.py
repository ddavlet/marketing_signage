from rest_framework import viewsets

from apps.users.permissions import IsAdminOrManagerOrReadOnly

from .models import Schedule
from .serializers import ScheduleSerializer


class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]

    def get_queryset(self):
        qs = Schedule.objects.select_related("device", "playlist")
        device_id = self.request.query_params.get("device")
        if device_id:
            qs = qs.filter(device_id=device_id)
        return qs

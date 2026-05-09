from rest_framework import viewsets

from apps.users.permissions import IsAdminOrManagerOrReadOnly

from .models import Location
from .serializers import LocationSerializer


class LocationViewSet(viewsets.ModelViewSet):
    serializer_class = LocationSerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]

    def get_queryset(self):
        # Return only root nodes; children are nested via the serializer
        return Location.objects.filter(parent=None).prefetch_related(
            "children",
            "children__children",
            "children__children__children",
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

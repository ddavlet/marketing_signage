from rest_framework import viewsets

from apps.users.permissions import IsAdminOrManagerOrReadOnly

from .models import Location
from .serializers import LocationSerializer


class LocationViewSet(viewsets.ModelViewSet):
    serializer_class = LocationSerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]

    def get_queryset(self):
        qs = Location.objects.prefetch_related(
            "children",
            "children__children",
            "children__children__children",
        )
        # List endpoint returns tree roots only; detail/update/delete use full queryset
        if self.action == "list":
            return qs.filter(parent=None)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

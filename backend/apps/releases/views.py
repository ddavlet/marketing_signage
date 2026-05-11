from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.users.permissions import IsAdminOrManagerOrReadOnly

from .models import Release
from .serializers import ReleaseSerializer


class ReleaseViewSet(viewsets.ModelViewSet):
    queryset = Release.objects.all()
    serializer_class = ReleaseSerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]

    @action(
        detail=False,
        methods=["get"],
        url_path="latest",
        permission_classes=[AllowAny],
    )
    def latest(self, request):
        """Return the newest active release matching channel, os, and arch.

        Called by the player agent updater — no auth required.
        """
        channel = request.query_params.get("channel", "stable")
        os_ = request.query_params.get("os", "")
        arch = request.query_params.get("arch", "")

        qs = Release.objects.filter(is_active=True, channel=channel)
        if os_:
            qs = qs.filter(os=os_)
        if arch:
            qs = qs.filter(arch=arch)

        release = qs.first()
        if release is None:
            return Response(
                {"detail": "No release found for the requested parameters."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(self.get_serializer(release).data)

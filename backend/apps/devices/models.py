import uuid

from django.conf import settings
from django.db import models
from django.utils.timezone import now


class Device(models.Model):
    name = models.CharField(max_length=200)
    location = models.ForeignKey(
        "locations.Location",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="devices",
    )
    api_key = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    assigned_playlist = models.ForeignKey(
        "playlists.Playlist",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="devices",
    )
    last_seen = models.DateTimeField(null=True, blank=True)
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    ONLINE_THRESHOLD_SECONDS = 90

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def status(self):
        if not self.last_seen:
            return "offline"
        delta = (now() - self.last_seen).total_seconds()
        return "online" if delta < self.ONLINE_THRESHOLD_SECONDS else "offline"

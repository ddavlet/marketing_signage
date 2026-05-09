from django.db import models


class PlayEvent(models.Model):
    device = models.ForeignKey(
        "devices.Device", on_delete=models.SET_NULL, null=True, related_name="play_events"
    )
    media = models.ForeignKey(
        "media_library.Media", on_delete=models.SET_NULL, null=True, related_name="play_events"
    )
    playlist = models.ForeignKey(
        "playlists.Playlist", on_delete=models.SET_NULL, null=True, blank=True, related_name="play_events"
    )
    played_at = models.DateTimeField(db_index=True)
    duration_seconds = models.PositiveIntegerField()

    class Meta:
        ordering = ["-played_at"]
        indexes = [
            models.Index(fields=["device", "played_at"]),
            models.Index(fields=["media", "played_at"]),
        ]

    def __str__(self):
        return f"{self.device} played {self.media} at {self.played_at}"

from django.conf import settings
from django.db import models


class PlaylistType(models.TextChoices):
    MEDIA_LIST = "media_list", "Media list"
    EXTERNAL_URL = "external_url", "External URL"


class Playlist(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=PlaylistType.choices, default=PlaylistType.MEDIA_LIST)
    external_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def bump_version(self):
        Playlist.objects.filter(pk=self.pk).update(version=models.F("version") + 1)


class PlaylistItem(models.Model):
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, related_name="items")
    media = models.ForeignKey("media_library.Media", on_delete=models.PROTECT, related_name="+")
    order = models.PositiveIntegerField()
    duration_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Overrides media default duration. Null = use media's duration.",
    )

    class Meta:
        unique_together = [("playlist", "order")]
        ordering = ["order"]

    def __str__(self):
        return f"{self.playlist.name} — item {self.order}"

from django.conf import settings
from django.db import models


class MediaType(models.TextChoices):
    IMAGE = "image", "Image"
    VIDEO = "video", "Video"


class Media(models.Model):
    name = models.CharField(max_length=200)
    file = models.FileField(upload_to="uploads/%Y/%m/")
    media_type = models.CharField(max_length=10, choices=MediaType.choices)
    duration_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Default display duration. Images default to 10s; null for videos means play full length.",
    )
    file_size = models.PositiveBigIntegerField()
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.name

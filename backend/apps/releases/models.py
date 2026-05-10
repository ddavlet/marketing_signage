from django.db import models


CHANNELS = [("stable", "Stable"), ("beta", "Beta")]

OS_CHOICES = [
    ("linux", "Linux"),
    ("darwin", "macOS"),
    ("windows", "Windows"),
]

ARCH_CHOICES = [
    ("amd64", "x86-64"),
    ("arm64", "ARM64"),
    ("arm", "ARM (32-bit)"),
]


class Release(models.Model):
    version = models.CharField(max_length=32)
    channel = models.CharField(max_length=16, choices=CHANNELS, default="stable", db_index=True)
    os = models.CharField(max_length=16, choices=OS_CHOICES, db_index=True)
    arch = models.CharField(max_length=16, choices=ARCH_CHOICES, db_index=True)

    download_url = models.URLField(max_length=500)
    sha256 = models.CharField(max_length=64)
    signature = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        # One active release per channel+os+arch combination makes sense as
        # a uniqueness target, but we don't enforce it in the DB — the view
        # just picks the latest active match.
        indexes = [
            models.Index(fields=["channel", "os", "arch", "is_active"]),
        ]

    def __str__(self):
        return f"{self.version} ({self.channel}/{self.os}/{self.arch})"

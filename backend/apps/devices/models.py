import uuid

from django.conf import settings
from django.db import models
from django.utils.timezone import now


class Device(models.Model):
    UPDATE_CHANNELS = [("stable", "Stable"), ("beta", "Beta")]

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

    # ── player agent fields ────────────────────────────────────────────────
    is_approved = models.BooleanField(default=False)
    hardware_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    sync_interval_seconds = models.PositiveIntegerField(default=60)
    update_channel = models.CharField(max_length=16, choices=UPDATE_CHANNELS, default="stable")
    screen_on_time = models.TimeField(null=True, blank=True)
    screen_off_time = models.TimeField(null=True, blank=True)
    timezone = models.CharField(max_length=64, default="UTC")
    player_version = models.CharField(max_length=32, blank=True, default="")
    os_info = models.JSONField(default=dict, blank=True)
    ssh_port = models.PositiveIntegerField(null=True, blank=True)
    anydesk_id = models.CharField(max_length=64, blank=True, default="")

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


class DeviceCommand(models.Model):
    KINDS = [
        ("restart_chromium", "Restart Chromium"),
        ("reboot", "Reboot Device"),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="commands")
    kind = models.CharField(max_length=32, choices=KINDS)
    payload = models.JSONField(default=dict, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    acked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self):
        return f"{self.kind} → {self.device.name}"

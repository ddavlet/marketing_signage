from django.db import models


DAYS = [(0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
        (3, "Thursday"), (4, "Friday"), (5, "Saturday"), (6, "Sunday")]


class Schedule(models.Model):
    device = models.ForeignKey(
        "devices.Device", on_delete=models.CASCADE, related_name="schedules"
    )
    playlist = models.ForeignKey(
        "playlists.Playlist", on_delete=models.CASCADE, related_name="schedules"
    )
    label = models.CharField(max_length=100, blank=True, help_text="e.g. Morning, Lunch")
    # [0,1,2,3,4] where 0=Monday, 6=Sunday
    days_of_week = models.JSONField(default=list)
    start_time = models.TimeField()
    end_time = models.TimeField()
    priority = models.PositiveIntegerField(
        default=0, help_text="Higher wins when schedules overlap"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["priority", "start_time"]

    def __str__(self):
        days = ", ".join(dict(DAYS)[d] for d in sorted(self.days_of_week) if d in dict(DAYS))
        return f"{self.device.name} — {self.label or self.playlist.name} ({days} {self.start_time}–{self.end_time})"

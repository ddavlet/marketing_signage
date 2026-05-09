from django.contrib import admin

from .models import PlayEvent


@admin.register(PlayEvent)
class PlayEventAdmin(admin.ModelAdmin):
    list_display = ["device", "media", "playlist", "played_at", "duration_seconds"]
    list_filter = ["device"]
    readonly_fields = ["device", "media", "playlist", "played_at", "duration_seconds"]
    date_hierarchy = "played_at"

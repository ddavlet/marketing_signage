from django.contrib import admin

from .models import Playlist, PlaylistItem


class PlaylistItemInline(admin.TabularInline):
    model = PlaylistItem
    extra = 0
    raw_id_fields = ["media"]
    ordering = ["order"]


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "is_active", "version", "created_by", "updated_at"]
    list_filter = ["type", "is_active"]
    search_fields = ["name"]
    inlines = [PlaylistItemInline]
    readonly_fields = ["version", "created_by", "created_at", "updated_at"]

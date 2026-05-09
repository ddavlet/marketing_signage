from django.contrib import admin

from .models import Media


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ["name", "media_type", "mime_type", "file_size", "uploaded_by", "uploaded_at"]
    list_filter = ["media_type"]
    search_fields = ["name"]
    readonly_fields = ["file_size", "mime_type", "media_type", "uploaded_by", "uploaded_at"]

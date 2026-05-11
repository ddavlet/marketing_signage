from django.contrib import admin

from .models import Release


@admin.register(Release)
class ReleaseAdmin(admin.ModelAdmin):
    list_display = ["version", "channel", "os", "arch", "is_active", "created_at"]
    list_filter = ["channel", "os", "arch", "is_active"]
    list_editable = ["is_active"]
    ordering = ["-created_at"]
    fieldsets = [
        (None, {"fields": ["version", "channel", "os", "arch", "is_active"]}),
        ("Binary", {
            "description": "Upload a binary file OR paste an external URL. Uploaded file takes priority.",
            "fields": ["binary", "download_url"],
        }),
        ("Metadata", {"fields": ["sha256", "signature", "notes"]}),
    ]

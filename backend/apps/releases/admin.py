import hashlib

from django.contrib import admin

from .models import Release


@admin.register(Release)
class ReleaseAdmin(admin.ModelAdmin):
    list_display = ["version", "channel", "os", "arch", "is_active", "created_at"]
    list_filter = ["channel", "os", "arch", "is_active"]
    list_editable = ["is_active"]
    ordering = ["-created_at"]
    readonly_fields = ["sha256"]
    fieldsets = [
        (None, {"fields": ["version", "channel", "os", "arch", "is_active"]}),
        ("Binary", {"fields": ["binary", "sha256"]}),
        ("Release notes", {"fields": ["notes"]}),
    ]

    def save_model(self, request, obj, form, change):
        if "binary" in form.changed_data and obj.binary:
            obj.binary.seek(0)
            obj.sha256 = hashlib.sha256(obj.binary.read()).hexdigest()
            obj.binary.seek(0)
        super().save_model(request, obj, form, change)

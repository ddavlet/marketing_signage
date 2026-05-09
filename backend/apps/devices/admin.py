from django.contrib import admin

from .models import Device


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ["name", "location", "assigned_playlist", "status", "last_seen", "registered_by"]
    list_filter = ["location"]
    search_fields = ["name"]
    readonly_fields = ["api_key", "status", "last_seen", "registered_by", "created_at", "updated_at"]
    raw_id_fields = ["location", "assigned_playlist", "registered_by"]

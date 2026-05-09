from django.contrib import admin

from .models import Location


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "created_by", "created_at"]
    list_filter = ["parent"]
    search_fields = ["name"]
    raw_id_fields = ["parent", "created_by"]

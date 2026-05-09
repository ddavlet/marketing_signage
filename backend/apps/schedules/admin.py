from django.contrib import admin

from .models import Schedule


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ["device", "playlist", "label", "days_of_week", "start_time", "end_time", "priority", "is_active"]
    list_filter = ["device", "is_active"]
    raw_id_fields = ["device", "playlist"]

from rest_framework import serializers

from .models import Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = [
            "id", "device", "playlist", "label",
            "days_of_week", "start_time", "end_time",
            "priority", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_days_of_week(self, value):
        if not isinstance(value, list) or not all(isinstance(d, int) and 0 <= d <= 6 for d in value):
            raise serializers.ValidationError("Must be a list of integers 0–6 (Mon–Sun).")
        return sorted(set(value))

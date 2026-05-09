from rest_framework import serializers

from .models import Location


class LocationSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = ["id", "name", "parent", "description", "children", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_children(self, obj):
        # Only recurse one level deep on list; full tree is built by the view
        qs = obj.children.all()
        return LocationSerializer(qs, many=True, context=self.context).data


class LocationFlatSerializer(serializers.ModelSerializer):
    """Flat serializer for dropdowns — no recursive children."""

    class Meta:
        model = Location
        fields = ["id", "name", "parent", "description", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]

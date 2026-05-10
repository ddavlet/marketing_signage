from django.db import migrations, models


def grandfather_existing_devices(apps, schema_editor):
    """Existing devices were created manually by admins; treat them as approved."""
    Device = apps.get_model("devices", "Device")
    Device.objects.update(is_approved=True)


class Migration(migrations.Migration):

    dependencies = [
        ("devices", "0003_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="device",
            name="is_approved",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="device",
            name="hardware_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="device",
            name="sync_interval_seconds",
            field=models.PositiveIntegerField(default=60),
        ),
        migrations.AddField(
            model_name="device",
            name="update_channel",
            field=models.CharField(
                choices=[("stable", "Stable"), ("beta", "Beta")],
                default="stable",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="device",
            name="screen_on_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="device",
            name="screen_off_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="device",
            name="timezone",
            field=models.CharField(default="UTC", max_length=64),
        ),
        migrations.AddField(
            model_name="device",
            name="player_version",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="device",
            name="os_info",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(grandfather_existing_devices, migrations.RunPython.noop),
    ]

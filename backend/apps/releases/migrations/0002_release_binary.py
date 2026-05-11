from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("releases", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="release",
            name="binary",
            field=models.FileField(blank=True, null=True, upload_to="player/binaries/"),
        ),
        migrations.AlterField(
            model_name="release",
            name="download_url",
            field=models.URLField(blank=True, default="", max_length=500),
        ),
    ]

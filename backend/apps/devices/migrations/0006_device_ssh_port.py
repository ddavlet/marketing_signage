from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('devices', '0005_devicecommand'),
    ]

    operations = [
        migrations.AddField(
            model_name='device',
            name='ssh_port',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]

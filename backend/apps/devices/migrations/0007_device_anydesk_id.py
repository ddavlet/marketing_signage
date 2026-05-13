from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('devices', '0006_device_ssh_port'),
    ]

    operations = [
        migrations.AddField(
            model_name='device',
            name='anydesk_id',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
    ]

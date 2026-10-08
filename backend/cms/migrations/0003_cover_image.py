from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("cms", "0002_names")]

    operations = [
        migrations.AddField(
            model_name="page",
            name="cover_image",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="page",
            name="cover_alt",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]

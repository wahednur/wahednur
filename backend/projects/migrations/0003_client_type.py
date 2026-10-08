from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("projects", "0002_project_is_system")]

    operations = [
        migrations.AddField(
            model_name="clientprofile",
            name="client_type",
            field=models.CharField(
                choices=[("local", "Local (Bangladesh)"), ("foreign", "Foreign")],
                default="local",
                max_length=7,
            ),
        ),
    ]

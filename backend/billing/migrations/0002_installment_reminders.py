from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("billing", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="installment",
            name="reminded_soon_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="installment",
            name="reminded_overdue_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

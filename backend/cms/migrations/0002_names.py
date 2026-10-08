from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("cms", "0001_initial")]

    operations = [
        migrations.AlterModelOptions(
            name="page",
            options={
                "ordering": ["-published_at", "-created_at"],
                "verbose_name": "blog post or page",
                "verbose_name_plural": "blog posts and pages",
            },
        ),
    ]

# Generated manually - revert to first_name/last_name and fix reminder_date type

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0015_lead_reminder_date_alter_lead_first_name_and_more'),
    ]

    operations = [
        # Change reminder_date from DateTimeField to DateField
        migrations.AlterField(
            model_name='lead',
            name='reminder_date',
            field=models.DateField(blank=True, help_text='Automated or manual reminder date', null=True),
        ),
    ]

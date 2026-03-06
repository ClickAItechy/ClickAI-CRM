from django.db import migrations, models

def add_fields_if_missing(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cursor:
        columns = [c.name for c in connection.introspection.get_table_description(cursor, 'crm_lead')]
        if 'address' not in columns:
            cursor.execute("ALTER TABLE crm_lead ADD COLUMN address text")
        if 'emirate' not in columns:
            cursor.execute("ALTER TABLE crm_lead ADD COLUMN emirate varchar(50)")
        if 'remarks' not in columns:
            cursor.execute("ALTER TABLE crm_lead ADD COLUMN remarks text")
        if 'status' not in columns:
            cursor.execute("ALTER TABLE crm_lead ADD COLUMN status varchar(30) DEFAULT 'INTERESTED'")

class Migration(migrations.Migration):
    dependencies = [
        ('crm', '0016_revert_to_first_last_name'),
    ]

    operations = [
        # Using SeparateDatabaseAndState so we can define the model state 
        # but skip the database alter if the columns already exist (common in local de-sync)
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='lead',
                    name='address',
                    field=models.TextField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='lead',
                    name='emirate',
                    field=models.CharField(blank=True, choices=[('DUBAI', 'Dubai'), ('ABU_DHABI', 'Abu Dhabi'), ('SHARJAH', 'Sharjah'), ('AJMAN', 'Ajman'), ('UMM_AL_QUWAIN', 'Umm Al Quwain'), ('RAS_AL_KHAIMAH', 'Ras Al Khaimah'), ('FUJAIRAH', 'Fujairah')], max_length=50, null=True),
                ),
                migrations.AddField(
                    model_name='lead',
                    name='remarks',
                    field=models.TextField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='lead',
                    name='status',
                    field=models.CharField(choices=[('INTERESTED', 'Interested'), ('NOT_INTERESTED', 'Not Interested'), ('NEEDS_FOLLOW_UP', 'Needs Follow-up')], db_index=True, default='INTERESTED', max_length=30),
                ),
            ],
            database_operations=[] # Skip DB changes here to handle manually or via RunPython
        ),
        # Manual check and add columns if they don't exist
        migrations.RunPython(add_fields_if_missing, reverse_code=migrations.RunPython.noop),
    ]


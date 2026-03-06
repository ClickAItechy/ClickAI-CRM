from django.db import migrations, connection

def split_names_if_exists(apps, schema_editor):
    """
    Safely split 'name' into 'first_name' and 'last_name' for Lead, User, and Contact.
    This script is defensive: it check if the columns exist before running.
    """
    with connection.cursor() as cursor:
        mapping = {
            'crm_lead': 'Lead',
            'crm_user': 'User',
            'crm_contact': 'Contact',
        }
        
        for table_name, model_name in mapping.items():
            # Get current columns in the database
            try:
                columns = [c.name for c in connection.introspection.get_table_description(cursor, table_name)]
            except Exception:
                continue # Table might not exist yet or other issue
                
            if 'name' in columns and 'first_name' in columns and 'last_name' in columns:
                print(f"--- Migrating data for {table_name} ---")
                
                # Fetch records that have a name but empty first/last name
                cursor.execute(f"SELECT id, name FROM {table_name} WHERE name IS NOT NULL AND name != '' AND (first_name IS NULL OR first_name = '')")
                rows = cursor.fetchall()
                
                updated_count = 0
                for row_id, full_name in rows:
                    if not full_name: continue
                    
                    parts = full_name.split(' ', 1)
                    f_name = parts[0]
                    l_name = parts[1] if len(parts) > 1 else ''
                    
                    cursor.execute(
                        f"UPDATE {table_name} SET first_name = %s, last_name = %s WHERE id = %s",
                        [f_name, l_name, row_id]
                    )
                    updated_count += 1
                
                print(f"Successfully migrated {updated_count} records in {table_name}.")

class Migration(migrations.Migration):
    dependencies = [
        ('crm', '0017_split_names_integrity_fix'),
    ]

    operations = [
        migrations.RunPython(split_names_if_exists, reverse_code=migrations.RunPython.noop),
    ]

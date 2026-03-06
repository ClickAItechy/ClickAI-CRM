import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

try:
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE crm_lead 
            SET name = TRIM(
                COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
            )
            WHERE (name = '' OR name IS NULL) 
              AND (first_name IS NOT NULL OR last_name IS NOT NULL);
        """)
        print(f"Updated {cursor.rowcount} lead names (using first_name and last_name).")
except Exception as e:
    print("Couldn't use first_name/last_name. Error:", e)

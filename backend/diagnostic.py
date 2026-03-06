import os
import django
import dj_database_url

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from crm.models import Lead
from django.db import connection

def diagnostic():
    db_config = connection.settings_dict
    host = db_config.get('HOST', 'Unknown')
    db_name = db_config.get('NAME', 'Unknown')
    
    # obfuscate host for safety
    safe_host = host[:10] + "..." if host else "None"
    
    count = Lead.objects.count()
    
    print("="*50)
    print("DIAGNOSTIC REPORT")
    print("="*50)
    print(f"DATABASE_URL Env Set: {'DATABASE_URL' in os.environ}")
    print(f"Connected Host: {safe_host}")
    print(f"Database Name: {db_name}")
    print(f"Total Leads Count: {count}")
    print("="*50)

if __name__ == "__main__":
    diagnostic()

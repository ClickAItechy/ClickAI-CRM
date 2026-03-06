import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from crm.models import Lead

for lead in Lead.objects.all()[:10]:
    print(f"ID: {lead.id}, Name: '{lead.name}'")


import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rbac.models import Role

roles = ['CEO', 'Sales', 'Operations', 'Marketing', 'Support']

for role_name in roles:
    role, created = Role.objects.get_or_create(name=role_name)
    if created:
        print(f"Created role: {role_name}")
    else:
        print(f"Role already exists: {role_name}")

print("Roles seeded successfully.")

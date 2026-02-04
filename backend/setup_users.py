import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rbac.models import Role, Permission
from crm.models import Team

User = get_user_model()

# Create or Update Admin Role
admin_role, _ = Role.objects.get_or_create(name='ADMIN')
sales_role, _ = Role.objects.get_or_create(name='SALES')

# Admin User
admin_user = User.objects.filter(username='admin').first()
if not admin_user:
    admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
else:
    admin_user.set_password('admin123')
    admin_user.save()

admin_user.roles.add(admin_role)
admin_user.is_manager = True
admin_user.team = Team.MANAGEMENT
admin_user.save()

# Sales User
sales_user = User.objects.filter(username='sales1').first()
if not sales_user:
    sales_user = User.objects.create_user('sales1', 'sales1@example.com', 'sales123')
else:
    sales_user.set_password('sales123')
    sales_user.save()

sales_user.roles.add(sales_role)
sales_user.is_manager = False
sales_user.team = Team.SALES
sales_user.save()

print('Users updated successfully')

import os
import django

# Setup Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Team
from rbac.models import Role

def create_requested_users():
    print("Creating Requested Users...")
    
    # Ensure roles exist
    role_sales, _ = Role.objects.get_or_create(name='Sales')
    role_ops, _ = Role.objects.get_or_create(name='Operations')
    role_marketing, _ = Role.objects.get_or_create(name='Marketing')

    user_data = [
        # Sales Team
        {'username': 'sales1', 'email': 'sales1@finkey.com', 'team': Team.SALES, 'role': role_sales},
        {'username': 'sales2', 'email': 'sales2@finkey.com', 'team': Team.SALES, 'role': role_sales},
        # Operations Team
        {'username': 'ops1', 'email': 'ops1@finkey.com', 'team': Team.OPERATIONS, 'role': role_ops},
        {'username': 'ops2', 'email': 'ops2@finkey.com', 'team': Team.OPERATIONS, 'role': role_ops},
        # Marketing Team
        {'username': 'marketing1', 'email': 'marketing1@finkey.com', 'team': Team.MARKETING, 'role': role_marketing},
        {'username': 'marketing2', 'email': 'marketing2@finkey.com', 'team': Team.MARKETING, 'role': role_marketing},
    ]

    for data in user_data:
        user, created = User.objects.get_or_create(
            username=data['username'],
            defaults={
                'email': data['email'],
                'team': data['team'],
                'is_manager': False
            }
        )
        user.set_password('password123')
        user.save()
        user.roles.add(data['role'])
        
        status = "Created" if created else "Updated"
        print(f"{status} user: {user.username} (Team: {user.team}, Role: {data['role'].name})")

if __name__ == '__main__':
    create_requested_users()
    print("Requested users setup successfully!")

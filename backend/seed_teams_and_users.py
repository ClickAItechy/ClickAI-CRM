import os
import django
import random
import string

# Setup Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Team
from rbac.models import Role

def generate_random_string(length=6):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def seed_teams_and_users():
    print("Seeding Teams and Users...")
    
    # Ensure roles exist for each team
    # (Using basic roles for simplicity, or matching roles to teams)
    roles = {
        Team.SALES: Role.objects.get_or_create(name='Sales')[0],
        Team.ADMIN: Role.objects.get_or_create(name='Admin')[0],
        Team.MARKETING: Role.objects.get_or_create(name='Marketing')[0],
        Team.CONSULTANCY: Role.objects.get_or_create(name='Consultancy')[0],
        Team.OPERATIONS: Role.objects.get_or_create(name='Operations')[0],
        Team.SUPPORT: Role.objects.get_or_create(name='Support')[0],
    }

    teams = [Team.SALES, Team.ADMIN, Team.MARKETING, Team.CONSULTANCY, Team.OPERATIONS, Team.SUPPORT]
    
    for team in teams:
        print(f"Creating users for team: {team}")
        role = roles[team]
        for i in range(1, 5):
            username = f"{team.lower()}_user_{i}_{generate_random_string(3)}"
            email = f"{username}@finkey.com"
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'team': team,
                    'is_manager': False
                }
            )
            user.set_password('password123')
            user.save()
            user.roles.add(role)
            
            if created:
                print(f"  - Created user: {username}")
            else:
                print(f"  - User {username} already exists")

if __name__ == '__main__':
    seed_teams_and_users()
    print("Seeding completed successfully!")

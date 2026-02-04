#!/usr/bin/env python
"""
Repopulate Users Script
Requirements:
- 1 Admin Login (Superuser)
- 1 Manager for each of the 6 teams
- 3 Teammates under each manager
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Team
from rbac.models import Role

def repopulate_users():
    print("=" * 50)
    print("REPOPULATING USERS")
    print("=" * 50)
    
    # Step 1: Delete all existing users
    print("\n[1] Deleting all existing users...")
    deleted_count = User.objects.all().delete()[0]
    print(f"    Deleted {deleted_count} users.")
    
    # Step 2: Ensure Roles Exist
    print("\n[2] Ensuring roles exist...")
    roles = {}
    role_names = ['Admin', 'Manager', 'Sales', 'Marketing', 'Consultancy', 'Operations', 'Support']
    for role_name in role_names:
        role, created = Role.objects.get_or_create(name=role_name)
        roles[role_name] = role
        status = "Created" if created else "Exists"
        # print(f"    {status}: {role_name}")

    # Step 3: Create Global Admin
    print("\n[3] Creating Global Admin...")
    admin_user = User.objects.create_superuser(
        username='admin',
        email='admin@finkey.com',
        password='password123',
        team=Team.ADMIN,
        is_manager=True
    )
    admin_user.roles.add(roles['Admin'])
    print("    Created: admin (password: password123)")

    # Step 4: Create Team Users (1 Manager + 3 Teammates per Team)
    print("\n[4] Creating Managers and Teammates...")
    
    teams = [
        (Team.SALES, 'sales'),
        (Team.ADMIN, 'admin'),
        (Team.MARKETING, 'marketing'),
        (Team.CONSULTANCY, 'consultancy'),
        (Team.OPERATIONS, 'operations'),
        (Team.SUPPORT, 'support'),
    ]

    for team_enum, prefix in teams:
        team_name = team_enum.label if hasattr(team_enum, 'label') else str(team_enum)
        print(f"\n    Processing Team: {team_name}")
        
        # 4.1 Create Manager
        # Using a consistent manager naming: {prefix}_manager
        manager_username = f"{prefix}_manager"
        manager = User.objects.create_user(
            username=manager_username,
            email=f"{manager_username}@finkey.com",
            password='password123',
            team=team_enum,
            is_manager=True,
            first_name=f"{prefix.title()}",
            last_name="Manager"
        )
        manager.roles.add(roles['Manager'])
        # Add specific role based on team if needed (e.g. Sales Role for Sales Manager)
        # Assuming Manager role is sufficient or adding team specific implementation path
        
        print(f"      - Manager: {manager_username}")

        # 4.2 Create 3 Teammates
        for i in range(1, 4):
            teammate_username = f"{prefix}_{i}"
            teammate = User.objects.create_user(
                username=teammate_username,
                email=f"{teammate_username}@finkey.com",
                password='password123',
                team=team_enum,
                is_manager=False,
                first_name=f"{prefix.title()}",
                last_name=f"Agent {i}"
            )
            # Assign team role if it exists in our role map, else default or skip
            # Mapping 'sales' prefix to 'Sales' role, etc.
            role_key = prefix.title() 
            if role_key in roles:
                teammate.roles.add(roles[role_key])
            
            print(f"      - Teammate: {teammate_username}")

    print("\n" + "=" * 50)
    print("DONE. All users password is 'password123'")
    print("=" * 50)

if __name__ == '__main__':
    repopulate_users()

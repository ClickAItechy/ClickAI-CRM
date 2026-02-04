#!/usr/bin/env python
"""
Reset and Seed Users Script
Deletes all existing users and creates a structured user base for ClickAI CRM.
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Team
from rbac.models import Role

def reset_and_seed_users():
    print("=" * 50)
    print("RESETTING AND SEEDING USERS FOR CLICKAI CRM")
    print("=" * 50)
    
    # Step 1: Delete all existing users
    print("\n[1] Deleting all existing users...")
    deleted_count = User.objects.all().delete()[0]
    print(f"    Deleted {deleted_count} users.")
    
    # Step 2: Create Roles
    print("\n[2] Creating roles...")
    roles = {}
    role_names = ['Admin', 'Sales', 'Tech']
    for role_name in role_names:
        role, created = Role.objects.get_or_create(name=role_name)
        roles[role_name] = role
        status = "Created" if created else "Exists"
        print(f"    {status}: {role_name}")
    
    # Step 3: Create Admin User
    print("\n[3] Creating Admin user...")
    admin_user = User.objects.create_superuser(
        username='admin',
        email='admin@clickai.tech',
        password='password123',
        team=Team.ADMIN,
        is_manager=True
    )
    admin_user.roles.add(roles['Admin'])
    print(f"    Created SUPERUSER: admin (password: password123)")
    
    # Step 4: Create Sales User
    print("\n[4] Creating Sales user...")
    sales_user = User.objects.create_user(
        username='sales',
        email='sales@clickai.tech',
        password='password123',
        team=Team.SALES,
        is_manager=False,
        is_staff=False
    )
    sales_user.roles.add(roles['Sales'])
    print(f"    Created SALES USER: sales (password: password123)")

    # Step 5: Create Tech User
    print("\n[5] Creating Tech user...")
    tech_user = User.objects.create_user(
        username='tech',
        email='tech@clickai.tech',
        password='password123',
        team=Team.TECH,
        is_manager=False,
        is_staff=False
    )
    tech_user.roles.add(roles['Tech'])
    print(f"    Created TECH USER: tech (password: password123)")
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Total users created: 3")
    print("\nUsers Created (password: password123):")
    print("  - admin (Admin Team, Superuser)")
    print("  - sales (Sales Team)")
    print("  - tech (Tech Team)")
    print("=" * 50)

if __name__ == '__main__':
    reset_and_seed_users()

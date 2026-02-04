#!/usr/bin/env python
"""
Seed Custom Data Script
Requirements:
- 3 Users: Admin (Sabiha), Sales (Ayman), Tech (Leenus)
- Specific thresholds and permissions
- Leads in every phase
"""
import os
import django
import random
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Team, Lead, LeadStage
from rbac.models import Role

def seed_custom_data():
    print("=" * 50)
    print("SEEDING CUSTOM DATA")
    print("=" * 50)

    # Step 1: Clean Slate
    print("\n[1] Deleting existing Users and Leads...")
    Lead.objects.all().delete()
    User.objects.all().delete()
    print("    - Data flushed.")

    # Ensure Roles
    admin_role, _ = Role.objects.get_or_create(name='Admin')
    manager_role, _ = Role.objects.get_or_create(name='Manager')
    sales_role, _ = Role.objects.get_or_create(name='Sales')
    tech_role, _ = Role.objects.get_or_create(name='Tech')

    # Step 2: Create Users
    print("\n[2] Creating Users...")
    
    # 2.1 Sabiha (Admin)
    sabiha = User.objects.create_superuser(
        username='sabiha',
        email='admin@clickaitech.ae',
        password='password123',
        first_name='Sabiha',
        last_name='Fatima',
        team=Team.ADMIN,
        is_manager=True,
        revenue_threshold=Decimal('10000.00'),
        view_tech_pipeline=True,
        manage_tech_pipeline=True
    )
    sabiha.roles.add(admin_role)
    print(f"    - Created: {sabiha.username} (Admin) - Threshold: {sabiha.revenue_threshold}")

    # 2.2 Ayman (Sales)
    ayman = User.objects.create_user(
        username='ayman',
        email='sales@clickaitech.ae',
        password='password123',
        first_name='Ayman',
        last_name='Khamis',
        team=Team.SALES,
        is_manager=True, # Giving manager status for visibility, can adjust if needed
        revenue_threshold=Decimal('60000.00'),
        view_tech_pipeline=False, # Explicitly False
        manage_tech_pipeline=False
    )
    ayman.roles.add(sales_role)
    print(f"    - Created: {ayman.username} (Sales) - Threshold: {ayman.revenue_threshold}")

    # 2.3 Leenus (Tech)
    leenus = User.objects.create_user(
        username='leenus',
        email='tech@clickaitech.ae',
        password='password123',
        first_name='Leenus',
        last_name='Valantine', # Assuming Last Name
        team=Team.TECH,
        is_manager=True,
        revenue_threshold=Decimal('15000.00'),
        view_tech_pipeline=True,
        manage_tech_pipeline=True
    )
    leenus.roles.add(tech_role)
    print(f"    - Created: {leenus.username} (Tech) - Threshold: {leenus.revenue_threshold}")

    all_users = [sabiha, ayman, leenus]

    # Step 3: Create Leads
    print("\n[3] Creating Leads...")
    
    stages = [
        LeadStage.NEW_INQUIRY, LeadStage.QUALIFICATION, LeadStage.DISCOVERY,
        LeadStage.PROPOSAL, LeadStage.NEGOTIATION, LeadStage.WON,
        LeadStage.PROJECT_EXECUTION, LeadStage.DELIVERED,
        LeadStage.LOST, LeadStage.ON_HOLD
    ]

    count = 0
    for stage in stages:
        # Create 2 leads per stage
        for i in range(1, 3):
            # Rotate lead generator
            generator = all_users[count % 3]
            
            # Varying budgets
            budget = Decimal(random.randint(5000, 100000))
            advance = budget * Decimal('0.3') if 'WON' in stage or 'EXECUTION' in stage or 'DELIVERED' in stage else Decimal('0.00')

            lead = Lead.objects.create(
                first_name=f"Client{count}",
                last_name=f"{stage.title()}",
                email=f"client{count}@{stage.lower()}.com",
                phone=f"+9715000000{count:02d}",
                company_name=f"Alpha {stage} {i} LLC",
                stage=stage,
                assigned_to=sabiha, # Assigned to Admin
                lead_generator=generator, # Rotated
                project_amount=budget,
                advance_amount=advance,
                created_at=timezone.now() - timedelta(days=random.randint(1, 60))
            )
            count += 1
            print(f"    - Created Lead: {lead.first_name} {lead.last_name} ({lead.stage}) - Gen: {generator.username}")

    print("\n" + "=" * 50)
    print("DONE. All passwords are 'password123'")
    print("=" * 50)

if __name__ == '__main__':
    seed_custom_data()

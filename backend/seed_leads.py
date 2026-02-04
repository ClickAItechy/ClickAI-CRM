import os
import django
import random
from faker import Faker

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import Lead, User, Team, LeadStage

def seed_leads():
    fake = Faker()
    print("=" * 50)
    print("SEEDING 10 TEST LEADS")
    print("=" * 50)

    # 1. Fetch Users
    sales_user = User.objects.filter(team=Team.SALES).first()
    tech_user = User.objects.filter(team=Team.TECH).first()
    admin_user = User.objects.filter(team=Team.ADMIN).first()

    if not sales_user or not tech_user:
        print("ERROR: Ensure Sales and Tech users exist manually or via seed script first.")
        return

    # 1. Clear existing leads/audit logs
    print("Clearing existing leads...")
    Lead.objects.all().delete()

    # 2. Define Ownership Map (Same as TransitionService)
    STAGE_OWNERSHIP = {
        LeadStage.LEAD_IN: (Team.SALES, sales_user),
        LeadStage.DISCOVERY: (Team.SALES, sales_user),
        LeadStage.PROPOSAL: (Team.SALES, sales_user),
        LeadStage.NEGOTIATION: (Team.SALES, sales_user),
        
        LeadStage.PROJECT_INITIATION: (Team.TECH, tech_user),
        LeadStage.IN_PROGRESS: (Team.TECH, tech_user),
        LeadStage.UAT: (Team.TECH, tech_user),
        LeadStage.DELIVERED: (Team.TECH, tech_user),
        LeadStage.SUPPORT: (Team.TECH, tech_user),
        
        LeadStage.CLOSED_WON: (Team.ADMIN, admin_user),
        LeadStage.CLOSED_LOST: (Team.ADMIN, admin_user),
    }

    stages = list(STAGE_OWNERSHIP.keys())

    for i in range(10):
        # Random stage
        stage = random.choice(stages)
        assigned_team, assigned_user = STAGE_OWNERSHIP[stage]

        # Fake Data
        first_name = fake.first_name()
        last_name = fake.last_name()
        company = fake.company()
        tech_reqs = fake.bs()
        
        # Truncate phone to max 20 chars
        phone = fake.phone_number()[:20]

        lead = Lead.objects.create(
            first_name=first_name,
            last_name=last_name,
            email=fake.email(),
            phone=phone,
            company_name=company,
            tech_requirements=f"Need: {tech_reqs}",
            stage=stage,
            assigned_team=assigned_team,
            assigned_to=assigned_user
        )
        
        print(f"Created Lead: {first_name} {last_name} ({company}) -> {stage} [{assigned_team}]")

    print("\nDone! 10 Leads created.")

if __name__ == '__main__':
    seed_leads()

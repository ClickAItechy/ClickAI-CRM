import os
import django
import random
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from faker import Faker

# Setup Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Lead, LeadStage, Account, Contact, Deal, Task, Note, Notification, Team
from rbac.models import Role

fake = Faker()

def clear_data():
    print("Clearing transactional data...")
    # Order matters for foreign keys
    Notification.objects.all().delete()
    Note.objects.all().delete()
    Task.objects.all().delete()
    Deal.objects.all().delete()
    Contact.objects.all().delete()
    Account.objects.all().delete()
    Lead.objects.all().delete()
    print("Data cleared.")

def repopulate_data():
    print("Repopulating data with realistic details...")
    users = list(User.objects.all())
    if not users:
        print("No users found! Please create users first.")
        return

    stages = LeadStage.choices
    now = timezone.now()

    # 1. Leads
    print("Creating Leads...")
    leads = []
    
    # Create ~50 realistic leads
    for i in range(50):
        days_ago = random.randint(0, 180)
        created_date = now - timedelta(days=days_ago)
        
        assigned_to = None
        if random.random() < 0.8:
            assigned_to = random.choice(users)
        
        lead = Lead(
            email=fake.email(),
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            phone=fake.numerify('+9715########'),
            salary_aed=Decimal(random.randint(5000, 50000)),
            is_expat=random.choice([True, False]),
            stage=LeadStage.DELIVERED if random.random() < 0.3 else random.choice(stages)[0],
            assigned_to=assigned_to,
            assigned_team=assigned_to.team if assigned_to else Team.SALES,
        )
        lead.created_at = created_date
        lead.save()
        leads.append(lead)

        # Create notes for leads
        if random.random() < 0.5:
             Note.objects.create(
                content=fake.sentence(),
                lead=lead,
                author=assigned_to if assigned_to else users[0]
            )

        # If lead is DELIVERED, create a WON deal
        if lead.stage == LeadStage.DELIVERED:
            deal_amount = Decimal(random.randint(20000, 100000))
            closing_date = now.date() - timedelta(days=random.randint(1, 60))
            
            if closing_date < created_date.date():
                closing_date = created_date.date() + timedelta(days=random.randint(1, 10))

            Deal.objects.create(
                name=f"Deal for {lead.first_name} {lead.last_name}",
                amount=deal_amount,
                stage='WON',
                closing_date=closing_date,
                owner=lead.assigned_to,
                account=None,
                contact=None
            )
            
            # Update lead updated_at
            Lead.objects.filter(id=lead.id).update(updated_at=closing_date)

    # 2. Accounts & Contacts & Deals
    print("Creating Business Data...")
    industries = ['Real Estate', 'Finance', 'Technology', 'Healthcare', 'Construction']
    
    for _ in range(20):
        owner = random.choice(users)
        company_name = fake.company()
        acc = Account.objects.create(
            name=company_name,
            industry=random.choice(industries),
            website=fake.url(),
            phone=fake.numerify('+9714#######'),
            owner=owner
        )
        
        # Contacts
        contact = Contact.objects.create(
            email=fake.email(),
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            phone=fake.numerify('+9715########'),
            account=acc,
            owner=owner
        )
        
        # Deals
        for _ in range(random.randint(1, 3)):
            closing_days_offset = random.randint(-60, 30)
            closing_date = now.date() + timedelta(days=closing_days_offset)
            stage = random.choice(['New', 'Negotiation', 'WON', 'LOST'])
            
            project_name = fake.bs().title()
            
            Deal.objects.create(
                name=f'{project_name} - {acc.name}',
                amount=Decimal(random.randint(10000, 500000)),
                stage=stage,
                closing_date=closing_date,
                account=acc,
                contact=contact,
                owner=owner
            )

    # 3. Tasks & Reminders
    print("Creating Tasks & Reminders...")
    for user in users:
        for _ in range(5):
            deadline = now + timedelta(days=random.randint(-2, 7))
            task_status = random.choice(['Not Started', 'In Progress', 'Completed'])
            
            task = Task.objects.create(
                subject=fake.catch_phrase(),
                description=fake.text(),
                deadline=deadline,
                status=task_status,
                priority=random.choice(['Normal', 'High']),
                owner=user
            )
            
            # Create a reminder/notification if deadline is close
            if task_status != 'Completed' and deadline > now:
                 Notification.objects.create(
                    recipient=user,
                    message=f'Reminder: {task.subject} due on {task.deadline.date()}',
                    task=task
                 )

if __name__ == '__main__':
    clear_data()
    repopulate_data()
    print("Database refresh with realistic data complete!")

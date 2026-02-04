import os
import django
import random
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

# Setup Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from crm.models import User, Lead, Account, Contact, Deal, Task, Team, LeadStage
from rbac.models import Role

def create_users():
    print("Creating Users...")
    users = []
    
    # 1. CEO
    ceo, _ = User.objects.get_or_create(username='ceo', email='ceo@finkey.com', defaults={'team': Team.ADMIN, 'is_manager': True})
    ceo.set_password('password123')
    ceo.save()
    role_ceo, _ = Role.objects.get_or_create(name='CEO')
    ceo.roles.add(role_ceo)
    users.append(ceo)

    # 2. Sales Manager
    s_mgr, _ = User.objects.get_or_create(username='sales_mgr', email='sales_mgr@finkey.com', defaults={'team': Team.SALES, 'is_manager': True})
    s_mgr.set_password('password123')
    s_mgr.save()
    role_sales, _ = Role.objects.get_or_create(name='Sales')
    s_mgr.roles.add(role_sales)
    users.append(s_mgr)

    # 3. Sales Reps
    for i in range(1, 4):
        rep, _ = User.objects.get_or_create(username=f'sales_rep{i}', email=f'rep{i}@finkey.com', defaults={'team': Team.SALES, 'is_manager': False})
        rep.set_password('password123')
        rep.save()
        rep.roles.add(role_sales)
        users.append(rep)

    # 4. Ops Manager
    o_mgr, _ = User.objects.get_or_create(username='ops_mgr', email='ops_mgr@finkey.com', defaults={'team': Team.OPERATIONS, 'is_manager': True})
    o_mgr.set_password('password123')
    o_mgr.save()
    role_ops, _ = Role.objects.get_or_create(name='Operations')
    o_mgr.roles.add(role_ops)
    users.append(o_mgr)
    
    return users

def create_leads(users):
    print("Creating Leads...")
    # FLUSH OLD DATA
    Lead.objects.all().delete()
    print("Old leads deleted.")

    stages = LeadStage.choices
    
    # Ensure sales1 user exists in the list or fetch it
    sales1 = User.objects.filter(username='sales1').first()
    if sales1 and sales1 not in users:
        users.append(sales1)

    for i in range(1, 41): # 40 Leads
        # 30% Unassigned -> MUST BE 'PROFILING'
        if i % 3 == 0:
            assigned_to = None
            assigned_team = Team.SALES # Unassigned leads belong to Sales queue initially
            stage = LeadStage.PROFILING
        # 20% Assigned specifically to sales1
        elif i % 5 == 0 and sales1:
            assigned_to = sales1
            assigned_team = Team.SALES
            stage = random.choice(stages)[0]
        # Rest assigned randomly
        else:
            assigned_to = random.choice(users)
            assigned_team = assigned_to.team if assigned_to.team else Team.SALES
            stage = random.choice(stages)[0]

        Lead.objects.create(
            email=f'lead{i}@example.com',
            first_name=f'LeadFirst{i}',
            last_name=f'LeadLast{i}',
            phone=f'+9715000000{i}',
            salary_aed=Decimal(random.randint(5000, 50000)),
            is_expat=random.choice([True, False]),
            stage=stage, 
            assigned_team=assigned_team,
            assigned_to=assigned_to
        )

def create_accounts_contacts_deals_tasks(users):
    print("Creating Accounts, Contacts, Deals, Tasks...")
    industries = ['Real Estate', 'Finance', 'Technology', 'Healthcare', 'Construction']
    
    for i in range(1, 11): # 10 Accounts
        owner = random.choice(users)
        acc, _ = Account.objects.get_or_create(
            name=f'Company {i} LLC',
            defaults={
                'industry': random.choice(industries),
                'website': f'http://company{i}.com',
                'phone': f'+971400000{i}',
                'owner': owner
            }
        )
        
        # Create 1-2 Contacts per Account
        for j in range(1, random.randint(2, 4)):
            contact, _ = Contact.objects.get_or_create(
                email=f'contact{i}_{j}@company{i}.com',
                defaults={
                    'first_name': f'ContactFirst{i}_{j}',
                    'last_name': f'ContactLast{i}_{j}',
                    'phone': f'+971550000{i}{j}',
                    'account': acc,
                    'owner': owner
                }
            )
            
            # Create a Deal for this Contact?
            if random.choice([True, False]):
                deal, _ = Deal.objects.get_or_create(
                    name=f'Deal for {acc.name} - Project {j}',
                    defaults={
                        'amount': Decimal(random.randint(10000, 500000)),
                        'stage': random.choice(['New', 'Negotiation', 'Won', 'Lost']),
                        'closing_date': date.today() + timedelta(days=random.randint(10, 90)),
                        'account': acc,
                        'contact': contact,
                        'owner': owner
                    }
                )
                
                # Create Tasks for Deal
                Task.objects.create(
                    subject=f'Follow up on {deal.name}',
                    deadline=timezone.now() + timedelta(days=random.randint(1, 7)),
                    status=random.choice(['Not Started', 'In Progress', 'Completed']),
                    priority=random.choice(['Normal', 'High']),
                    deal=deal,
                    contact=contact,
                    owner=owner
                )

if __name__ == '__main__':
    users = create_users()
    create_leads(users)
    create_accounts_contacts_deals_tasks(users)
    print("Database populated successfully!")

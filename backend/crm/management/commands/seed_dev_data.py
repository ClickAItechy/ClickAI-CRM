from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from crm.models import Team, Lead, LeadStage, Emirate, Account, Contact, Deal, Task, FollowUpReminder, Invoice, Quotation
import random
import decimal

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with sample data for development performance and testing.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # 1. Ensure Users and Roles exist
        # Re-use setup_users logic or just get existing
        admin_user = User.objects.filter(username='admin').first()
        if not admin_user:
            admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
            admin_user.team = Team.ADMIN
            admin_user.save()
            self.stdout.write('Created admin user')

        sales_user = User.objects.filter(username='sales1').first()
        if not sales_user:
            sales_user = User.objects.create_user('sales1', 'sales1@example.com', 'sales123')
            sales_user.team = Team.SALES
            sales_user.save()
            self.stdout.write('Created sales1 user')

        # 2. Create Accounts
        industries = ['Banking', 'Real Estate', 'Logistics', 'Retail', 'Healthcare']
        accounts = []
        for i in range(1, 6):
            account, _ = Account.objects.get_or_create(
                name=f'Sample Account {i}',
                defaults={
                    'industry': random.choice(industries),
                    'website': f'https://account{i}.com',
                    'owner': admin_user
                }
            )
            accounts.append(account)
        self.stdout.write(f'Created/Found {len(accounts)} Accounts')

        # 3. Create Contacts
        for i, account in enumerate(accounts):
            Contact.objects.get_or_create(
                email=f'contact{i}@account.com',
                defaults={
                    'first_name': f'John{i}',
                    'last_name': f'Doe{i}',
                    'phone': f'050111222{i}',
                    'account': account,
                    'owner': sales_user
                }
            )
        self.stdout.write('Created Contacts')

        # 4. Create Leads
        lead_names = [
            'Global Logistics Solutions', 'Aura Real Estate', 'Zenix Tech', 
            'Sarah Al-Maktoum', 'David Miller', 'Cloud Nine Digital'
        ]
        
        stages = [stage for stage, _ in LeadStage.choices]
        emirates = [emirate for emirate, _ in Emirate.choices]
        
        leads = []
        for i, full_name in enumerate(lead_names):
            parts = full_name.split(' ', 1)
            f_name = parts[0]
            l_name = parts[1] if len(parts) > 1 else ''
            
            lead, _ = Lead.objects.get_or_create(
                first_name=f_name,
                last_name=l_name,
                defaults={
                    'email': f'info@{full_name.lower().replace(" ", "")}.com',
                    'phone': f'055{i}234567',
                    'stage': stages[i % len(stages)],
                    'emirate': random.choice(emirates),
                    'assigned_to': sales_user if i % 2 == 0 else admin_user,
                    'project_amount': random.randint(5000, 50000),
                    'advance_amount': random.randint(0, 2000),
                    'lead_generator': admin_user
                }
            )
            leads.append(lead)
        self.stdout.write(f'Created/Found {len(leads)} Leads')

        # 5. Create Reminders
        for lead in leads:
            FollowUpReminder.objects.get_or_create(
                lead=lead,
                message=f"Follow up with {lead.first_name} {lead.last_name} regarding the project requirements.",
                defaults={
                    'assigned_to': lead.assigned_to,
                    'due_date': timezone.now() + timedelta(days=random.randint(-2, 5)),
                    'status': 'PENDING'
                }
            )
        self.stdout.write('Created Reminders')

        # 6. Create Quotations
        for i in range(1, 4):
            lead = leads[i % len(leads)]
            Quotation.objects.get_or_create(
                quotation_number=f'Q-2026-{i:03}',
                defaults={
                    'client_name': f"{lead.first_name} {lead.last_name}".strip(),
                    'client_email': lead.email,
                    'grand_total': lead.project_amount,
                    'status': 'SENT',
                    'created_by': admin_user,
                    'items': [{'name': 'Initial Setup', 'price': float(lead.project_amount), 'quantity': 1, 'subtotal': float(lead.project_amount)}]
                }
            )
        self.stdout.write('Created Quotations')

        # 7. Create Invoices
        for i in range(1, 4):
            lead = leads[(i+1) % len(leads)]
            Invoice.objects.get_or_create(
                invoice_number=f'INV-2026-{i:03}',
                defaults={
                    'client_name': f"{lead.first_name} {lead.last_name}".strip(),
                    'client_email': lead.email,
                    'grand_total': lead.project_amount * decimal.Decimal('1.05'), # +5% tax maybe? keep it simple
                    'status': 'ISSUED',
                    'created_by': admin_user,
                    'items': [{'name': 'Service Fee', 'price': float(lead.project_amount), 'quantity': 1, 'subtotal': float(lead.project_amount)}]
                }
            )
        self.stdout.write('Created Invoices')

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
import decimal

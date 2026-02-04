from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from crm.models import Lead, FollowUpReminder, User, Team

class Command(BaseCommand):
    help = 'Populates sales1 with sample reminders for demo'

    def handle(self, *args, **kwargs):
        # 1. Get or Create sales1
        user, created = User.objects.get_or_create(username='sales1')
        if created:
            user.set_password('password123')
            user.email = 'sales1@example.com'
            user.team = Team.SALES
            user.save()
            self.stdout.write(f"Created user {user.username}")
        else:
             self.stdout.write(f"Found user {user.username}")

        # 2. Ensure we have some dummy leads assigned to sales1
        # Create a few if not enough
        lead_count = Lead.objects.filter(assigned_to=user).count()
        if lead_count < 3:
            for i in range(3):
                Lead.objects.create(
                    first_name=f"DemoLead{i}",
                    last_name="Test",
                    email=f"demo{i}@test.com",
                    phone=f"05000000{i}",
                    assigned_to=user,
                    stage='PROFILING'
                )
            self.stdout.write("Created dummy leads for sales1")

        leads = list(Lead.objects.filter(assigned_to=user))

        # 3. Create Scenarios
        
        # Scenario A: Overdue (Yesterday)
        FollowUpReminder.objects.create(
            lead=leads[0],
            assigned_to=user,
            reminder_type='MANUAL',
            status='PENDING',
            due_date=timezone.now() - timedelta(days=1),
            message="Follow up with Sarah for valuation fee payment"
        )

        # Scenario B: Urgent (Today)
        FollowUpReminder.objects.create(
            lead=leads[0], # same lead or next
            assigned_to=user,
            reminder_type='MANUAL',
            status='PENDING',
            due_date=timezone.now(),
            message="URGENT: Call Ahmed regarding missing bank statement"
        )
        
        # Scenario C: Upcoming (Tomorrow)
        if len(leads) > 1:
             lead_c = leads[1]
        else:
             lead_c = leads[0]

        FollowUpReminder.objects.create(
            lead=lead_c,
            assigned_to=user,
            reminder_type='MANUAL',
            status='PENDING',
            due_date=timezone.now() + timedelta(days=1),
            message="Meeting with Mr. John at 2 PM for signing"
        )
        
        # Scenario D: Auto-Generated Stale (Simulated)
        if len(leads) > 2:
             lead_d = leads[2]
        else:
             lead_d = leads[0]
             
        FollowUpReminder.objects.create(
            lead=lead_d,
            assigned_to=user,
            reminder_type='AUTO',
            status='PENDING',
            due_date=timezone.now(), # Due "now" as it triggered
            message="Stale Lead: Has not been contacted in over 3 days. Please follow up."
        )

        self.stdout.write(self.style.SUCCESS(f"Successfully populated reminders for {user.username}"))

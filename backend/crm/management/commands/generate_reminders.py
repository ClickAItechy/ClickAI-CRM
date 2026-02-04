from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from crm.models import Lead, FollowUpReminder, User, LeadStage

class Command(BaseCommand):
    help = 'Auto-generates follow-up reminders for stale and new leads'

    def handle(self, *args, **kwargs):
        self.stdout.write("Running auto-reminder generation...")
        
        # 1. Stale Leads (Last contacted > 3 days ago)
        three_days_ago = timezone.now() - timedelta(days=3)
        stale_leads = Lead.objects.filter(
            last_contacted__lt=three_days_ago
        ).exclude(
            stage__in=[LeadStage.LOST, LeadStage.DELIVERED, LeadStage.ON_HOLD]
        )
        
        stale_count = 0
        for lead in stale_leads:
            # Check if pending reminder already exists to avoid duplicates
            exists = FollowUpReminder.objects.filter(
                lead=lead, 
                status='PENDING',
                reminder_type='AUTO',
                message__contains='Stale Lead'
            ).exists()
            
            if not exists and lead.assigned_to:
                FollowUpReminder.objects.create(
                    lead=lead,
                    assigned_to=lead.assigned_to,
                    reminder_type='AUTO',
                    status='PENDING',
                    due_date=timezone.now(),
                    message=f"Stale Lead: Has not been contacted in over 3 days. Please follow up."
                )
                stale_count += 1

        self.stdout.write(f"Generated {stale_count} reminders for stale leads.")

        # 2. New Leads (Created > 24 hours ago and still in 'New' equivalent stage or untouched)
        # Assuming 'PROFILING' is the first stage.
        one_day_ago = timezone.now() - timedelta(days=1)
        new_untouched_leads = Lead.objects.filter(
            stage=LeadStage.NEW_INQUIRY,
            created_at__lt=one_day_ago,
            last_contacted__isnull=True
        )

        new_count = 0
        for lead in new_untouched_leads:
             # Check for duplicates
            exists = FollowUpReminder.objects.filter(
                lead=lead, 
                status='PENDING',
                reminder_type='AUTO',
                message__contains='New Lead'
            ).exists()

            if not exists and lead.assigned_to:
                FollowUpReminder.objects.create(
                    lead=lead,
                    assigned_to=lead.assigned_to,
                    reminder_type='AUTO',
                    status='PENDING',
                    due_date=timezone.now(),
                    message=f"New Lead: Created over 24 hours ago and no contact logged."
                )
                new_count += 1
                
        self.stdout.write(f"Generated {new_count} reminders for new untouched leads.")
        self.stdout.write(self.style.SUCCESS('Auto-reminder generation complete.'))

from django.utils import timezone
from .models import Lead, Team, AuditLog, LeadStage

class TransitionService:
    
    # All stages are managed by ADMIN - no auto-assignment
    STAGE_OWNERSHIP = {
        LeadStage.NEW_INQUIRY: Team.ADMIN,
        LeadStage.QUALIFICATION: Team.ADMIN,
        LeadStage.DISCOVERY: Team.ADMIN,
        LeadStage.PROPOSAL: Team.ADMIN,
        LeadStage.NEGOTIATION: Team.ADMIN,
        LeadStage.WON: Team.ADMIN,
        LeadStage.PROJECT_EXECUTION: Team.ADMIN,
        LeadStage.DELIVERED: Team.ADMIN,
        LeadStage.LOST: Team.ADMIN,
        LeadStage.ON_HOLD: Team.ADMIN,
    }

    # Define allowed transitions for strict control (optional but recommended)
    # For now, we will allow linear progression + bouncing back
    
    @staticmethod
    @staticmethod
    def change_stage(lead: Lead, new_stage: str, user, notes: str = ""):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        from .models import Task, Notification

        old_stage = lead.stage
        old_team = lead.assigned_team
        
        # 1. Update Lead Stage
        lead.stage = new_stage
        
        # 2. Determine New Team Owner
        new_team = TransitionService.STAGE_OWNERSHIP.get(new_stage)
        
        # KEY LOGIC: "Stage Change -> Lead assigned to Team Manager -> Manager assigns to Teammate"
        if new_team:
            lead.assigned_team = new_team
            
            # Find Manager of the new team
            # We assume one manager per team for simplicity, or pick the first one
            manager = User.objects.filter(team=new_team, is_manager=True).first()
            
            if manager:
                lead.assigned_to = manager
                
                # 3. Create Task for Manager
                Task.objects.create(
                    owner=manager,
                    subject=f"Assign Lead: {lead.name}",
                    description=f"Lead moved to {new_stage} ({new_team}). Please assign to a team member.",
                    priority='High',
                    status='Not Started',
                    deadline=timezone.now() + timezone.timedelta(hours=24) # 24h SLA
                )

                # 4. Notify Manager
                Notification.objects.create(
                    recipient=manager,
                    message=f"ACTION REQUIRED: New Lead {lead.name} in {new_stage} needs assignment.",
                    lead=lead
                )
            else:
                # Fallback: Leave assigned to 'None' (Unassigned) so Admins can catch it
                lead.assigned_to = None 
                
        lead.save()
        
        # 5. Create Audit Log
        AuditLog.objects.create(
            lead=lead,
            actor=user,
            action="Stage Change",
            from_stage=old_stage,
            to_stage=new_stage,
            notes=notes
        )
            
        return lead

    @staticmethod
    def can_edit(user, lead):
        """
        Dynamic Permissions:
        - Managers can always edit.
        - Team members can only edit if the lead is in their team's stage.
        - The assigned user can always edit.
        - The lead generator can always edit.
        """
        if getattr(user, 'is_manager', False) or user.is_superuser:
            return True
        
        # User is assigned to the lead
        if lead.assigned_to == user:
            return True
            
        # User generated the lead
        if lead.lead_generator == user:
            return True

        # User is in the team that owns the current stage
        return getattr(user, 'team', None) == lead.assigned_team

class StagnationService:
    @staticmethod
    def check_and_alert(user):
        """
        Checks for leads assigned to the user that haven't been updated in 24 hours.
        Triggers a notification if one hasn't been sent today.
        Returns the count of stagnant leads.
        """
        from datetime import timedelta
        from django.utils import timezone
        from .models import Notification, Lead, LeadStage, FollowUpReminder
        
        # 1. Define Threshold (2 Days)
        threshold = timezone.now() - timedelta(days=2)
        
        # 2. Find Stagnant Leads
        stagnant_leads = Lead.objects.filter(
            assigned_to=user,
            updated_at__lt=threshold
        ).exclude(
            stage__in=[LeadStage.WON, LeadStage.LOST, LeadStage.DELIVERED]
        )
        
        # 3. Optimization: Get all pending reminder lead IDs for this user in one query
        existing_reminder_lead_ids = set(FollowUpReminder.objects.filter(
            assigned_to=user,
            status=FollowUpReminder.Status.PENDING,
            lead__in=stagnant_leads
        ).values_list('lead_id', flat=True))
        
        count = 0
        reminders_to_create = []
        
        for lead in stagnant_leads:
            # Check if we already have a PENDING reminder for this lead in our fetched set
            if lead.id not in existing_reminder_lead_ids:
                # 4. Prepare FollowUpReminder for bulk creation (or just create if few)
                reminders_to_create.append(FollowUpReminder(
                    lead=lead,
                    assigned_to=user,
                    reminder_type=FollowUpReminder.Type.AUTO,
                    status=FollowUpReminder.Status.PENDING,
                    due_date=timezone.now(),
                    message=f"Stagnant Lead: {lead.name} has been in {lead.get_stage_display()} since {lead.updated_at.strftime('%Y-%m-%d')}."
                ))
                count += 1
        
        if reminders_to_create:
            FollowUpReminder.objects.bulk_create(reminders_to_create)
                
        return count

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import FollowUpReminder, Task, Notification, Lead, TechPipeline, LeadStage, RevenueRecord

@receiver(post_save, sender=FollowUpReminder)
def notify_on_reminder_creation(sender, instance, created, **kwargs):
    """
    When a FollowUpReminder is created, send a Notification to the assigned user.
    """
    if created:
        Notification.objects.create(
            recipient=instance.assigned_to,
            lead=instance.lead,
            message=f"New Reminder: {instance.message}",
            is_read=False
        )

@receiver(post_save, sender=Task)
def notify_on_task_assignment(sender, instance, created, **kwargs):
    """
    When a Task is created or owner changes, send a Notification to the owner.
    """
    if created and instance.owner:
        Notification.objects.create(
            recipient=instance.owner,
            task=instance,
            message=f"New Task Assigned: {instance.subject}",
            is_read=False
        )


@receiver(post_save, sender=Lead)
def create_tech_pipeline_on_stage_change(sender, instance, created, **kwargs):
    """
    When a Lead moves to PROJECT_EXECUTION, auto-create a Tech Pipeline instance.
    """
    if instance.stage == LeadStage.PROJECT_EXECUTION:
        # Check if pipeline exists
        if not hasattr(instance, 'tech_pipeline'):
            TechPipeline.objects.create(lead=instance)


@receiver(pre_save, sender=Lead)
def capture_previous_state(sender, instance, **kwargs):
    """
    Capture the previous state of the lead before saving to DB.
    Used for detecting changes in advance_amount.
    """
    if instance.pk:
        try:
            old_instance = Lead.objects.get(pk=instance.pk)
            instance._old_advance_amount = old_instance.advance_amount
        except Lead.DoesNotExist:
            instance._old_advance_amount = 0
    else:
        instance._old_advance_amount = 0


@receiver(post_save, sender=Lead)
def track_revenue_update(sender, instance, created, **kwargs):
    """
    Track revenue when advance_amount is increased.
    Only applies if:
    1. Lead has a lead_generator
    2. Lead is in a valid revenue stage (WON or later)
    3. Amount has increased
    """
    # Define valid stages for revenue recognition
    # "once the lead crosses won state... every money... counts as revenue"
    # So basically WON and anything after that (PROJECT_EXECUTION, DELIVERED, even CLOSED_LOST if they paid something?)
    # Generally money is taken on WON. Let's stick to WON and beyond.
    VALID_REVENUE_STAGES = [
        LeadStage.WON,
        LeadStage.PROJECT_EXECUTION,
        LeadStage.DELIVERED
    ]
    
    if instance.stage not in VALID_REVENUE_STAGES:
        # User request says: "once the lead crosses won state. The advance will be recieved... so every money... counts as revenue"
        # It implies they might update advance amount AFTER moving to WON.
        # But what if they add money while in NEGOTIATION? 
        # Typically "advance" implies prep for project start, so closer to WON.
        # Strict interpretation: Only count if current stage is WON/EXECUTION/DELIVERED.
        return

    if not instance.lead_generator:
        return

    old_amount = getattr(instance, '_old_advance_amount', 0)
    new_amount = instance.advance_amount
    
    # Check for increase
    if new_amount > old_amount:
        delta = new_amount - old_amount
        
        now = timezone.now()
        
        # Create Revenue Record
        RevenueRecord.objects.create(
            user=instance.lead_generator,
            lead=instance,
            amount=delta,
            month=now.month,
            year=now.year
        )


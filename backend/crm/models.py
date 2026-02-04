from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Team(models.TextChoices):
    SALES = 'SALES', _('Sales')
    ADMIN = 'ADMIN', _('Admin')
    TECH = 'TECH', _('Tech')

class User(AbstractUser):
    team = models.CharField(
        max_length=20,
        choices=Team.choices,
        default=Team.SALES
    )
    is_manager = models.BooleanField(default=False)
    view_all_leads = models.BooleanField(default=False)
    
    # Granular Permissions from Admin Panel
    view_tech_pipeline = models.BooleanField(default=False)
    manage_tech_pipeline = models.BooleanField(default=False)
    can_create_leads = models.BooleanField(default=True)
    can_delete_leads = models.BooleanField(default=False)
    can_export_leads = models.BooleanField(default=False)
    
    # Revenue tracking
    revenue_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text=_('Monthly revenue target for incentive calculation'))

    def __str__(self):
        return f"{self.username} ({self.team})"

class LeadStage(models.TextChoices):
    NEW_INQUIRY = 'NEW_INQUIRY', _('New Inquiry')
    QUALIFICATION = 'QUALIFICATION', _('Qualification')
    DISCOVERY = 'DISCOVERY', _('Discovery')
    PROPOSAL = 'PROPOSAL', _('Proposal')
    NEGOTIATION = 'NEGOTIATION', _('Negotiation')
    WON = 'WON', _('Won')
    PROJECT_EXECUTION = 'PROJECT_EXECUTION', _('Project Execution')
    DELIVERED = 'DELIVERED', _('Delivered')
    LOST = 'LOST', _('Lost')
    ON_HOLD = 'ON_HOLD', _('On Hold')

class Lead(models.Model):
    # Customer Info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True)
    
    # IT/Agency Specifics
    company_name = models.CharField(max_length=200, blank=True, null=True)
    tech_requirements = models.TextField(blank=True, null=True)
    
    # Process Info
    stage = models.CharField(
        max_length=30,
        choices=LeadStage.choices,
        default=LeadStage.NEW_INQUIRY
    )
    assigned_team = models.CharField(
        max_length=20,
        choices=Team.choices,
        default=Team.SALES
    )
    assigned_to = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='leads'
    )
    lead_generator = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_leads',
        help_text=_('Team member who brought in this lead')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_active = models.DateTimeField(auto_now_add=True)

    # Follow-up tracking fields
    last_contacted = models.DateTimeField(null=True, blank=True, help_text=_('Last time this lead was contacted'))
    next_followup = models.DateTimeField(null=True, blank=True, help_text=_('Scheduled next follow-up'))
    # Note: score and score_updated_at fields exist in database but are not used
    
    # Financials
    project_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    advance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    @property
    def remaining_amount(self):
        return self.project_amount - self.advance_amount

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.stage}"

class LeadDocument(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255, blank=True)
    file_path = models.FileField(upload_to='lead_docs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Document {self.name} for {self.lead}"

class AuditLog(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='audit_logs')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100) # e.g., "Stage Change", "Assignment"
    from_stage = models.CharField(max_length=30, blank=True, null=True)
    to_stage = models.CharField(max_length=30, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.action} on {self.lead} by {self.actor}"

class Account(models.Model):
    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='accounts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='contacts', null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='contacts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Deal(models.Model):
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    stage = models.CharField(max_length=50, default='New')
    closing_date = models.DateField(null=True, blank=True)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='deals', null=True, blank=True)
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, related_name='deals', null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='deals')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Note(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note on {self.lead} by {self.author} at {self.created_at}"

class Task(models.Model):
    subject = models.CharField(max_length=255)
    deadline = models.DateTimeField(null=True, blank=True) # Renamed from due_date
    status = models.CharField(max_length=50, default='Not Started')
    priority = models.CharField(max_length=20, default='Normal')
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    lead = models.ForeignKey('Lead', on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='tasks')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.subject

class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message[:20]}"

class FollowUpReminder(models.Model):
    class Type(models.TextChoices):
        AUTO = 'AUTO', _('Auto-generated')
        MANUAL = 'MANUAL', _('Manual')

    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        COMPLETED = 'COMPLETED', _('Completed')
        DISMISSED = 'DISMISSED', _('Dismissed')

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='reminders')
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reminders')
    reminder_type = models.CharField(max_length=10, choices=Type.choices, default=Type.AUTO)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    due_date = models.DateTimeField()
    message = models.TextField()
    is_read = models.BooleanField(default=False, help_text=_('Whether the reminder has been read'))
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f"Reminder for {self.lead} (Due: {self.due_date})"

class TechPipelineStage(models.TextChoices):
    PLANNING = 'PLANNING', _('Planning')
    DESIGNING = 'DESIGNING', _('Designing')
    EXECUTING = 'EXECUTING', _('Executing')
    REVIEW = 'REVIEW', _('Review')
    TESTING = 'TESTING', _('Testing')

class TechPipeline(models.Model):
    lead = models.OneToOneField(Lead, on_delete=models.CASCADE, related_name='tech_pipeline')
    stage = models.CharField(
        max_length=20, 
        choices=TechPipelineStage.choices, 
        default=TechPipelineStage.PLANNING
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tech Pipeline for {self.lead} - {self.stage}"

class RevenueRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='revenue_records')
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    recorded_at = models.DateTimeField(auto_now_add=True)
    month = models.IntegerField()  # 1-12
    year = models.IntegerField()

    class Meta:
        indexes = [
            models.Index(fields=['user', 'month', 'year']),
        ]

    def __str__(self):
        return f"Revenue: {self.user.username} - {self.amount} ({self.month}/{self.year})"

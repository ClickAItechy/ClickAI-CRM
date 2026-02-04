from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User, Lead, Team, AuditLog, LeadDocument, Account, Contact, Deal, Task, Note, Notification, FollowUpReminder, TechPipeline

# Customize Admin Site Header
admin.site.site_header = "Finkey CRM Administration"
admin.site.site_title = "Finkey CRM Admin"
admin.site.index_title = "Welcome to Finkey CRM Management Portal"


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'team_badge', 'is_manager', 'view_all_leads', 'view_tech_pipeline', 'manage_tech_pipeline')
    list_editable = ('is_manager', 'view_all_leads', 'view_tech_pipeline', 'manage_tech_pipeline')
    list_filter = ('team', 'is_manager', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('team', 'username')
    
    fieldsets = UserAdmin.fieldsets + (
        ('CRM Info', {'fields': ('team', 'is_manager')}),
        ('Permissions', {'fields': ('view_all_leads', 'view_tech_pipeline', 'manage_tech_pipeline', 'can_create_leads', 'can_delete_leads', 'can_export_leads')}),
    )
    
    def team_badge(self, obj):
        colors = {
            'SALES': '#22c55e',
            'ADMIN': '#ef4444',
            'TECH': '#3b82f6',
        }
        color = colors.get(obj.team, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.team
        )
    team_badge.short_description = 'Team'
    team_badge.admin_order_field = 'team'


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'phone', 'stage', 'assigned_team', 'assigned_to', 'created_at')
    list_filter = ('stage', 'assigned_team')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Name'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('lead', 'actor', 'action', 'from_stage', 'to_stage', 'timestamp')
    list_filter = ('action', 'from_stage', 'to_stage')
    ordering = ('-timestamp',)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'industry', 'phone', 'owner', 'created_at')
    list_filter = ('industry',)
    search_fields = ('name',)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'phone', 'account', 'owner')
    search_fields = ('first_name', 'last_name', 'email')
    list_filter = ('account',)


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount', 'stage', 'account', 'owner', 'closing_date')
    list_filter = ('stage',)
    search_fields = ('name',)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('subject', 'status', 'priority', 'owner', 'deadline')
    list_filter = ('status', 'priority')
    search_fields = ('subject',)
    ordering = ('deadline',)


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('lead', 'author', 'created_at')
    list_filter = ('author',)
    ordering = ('-created_at',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'message_preview', 'is_read', 'created_at')
    list_filter = ('is_read', 'recipient')
    ordering = ('-created_at',)
    
    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'


admin.site.register(LeadDocument)


@admin.register(FollowUpReminder)
class FollowUpReminderAdmin(admin.ModelAdmin):
    list_display = ('lead', 'assigned_to', 'status', 'due_date', 'reminder_type')
    list_filter = ('status', 'reminder_type', 'due_date', 'assigned_to')

@admin.register(TechPipeline)
class TechPipelineAdmin(admin.ModelAdmin):
    list_display = ('lead', 'stage', 'created_at', 'updated_at')
    list_filter = ('stage',)
    search_fields = ('lead__first_name', 'lead__last_name', 'notes')
    ordering = ('-updated_at',)

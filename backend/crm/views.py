from rest_framework import serializers, viewsets, status, permissions, filters, exceptions
import csv
from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
import openpyxl
from openpyxl import Workbook
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models.functions import TruncDay, TruncMonth, TruncYear, Coalesce
from django.db.models import Count, Sum, F, ExpressionWrapper, FloatField, Q, Prefetch
from django.db import models
from django.db.models import Count, Sum # Added aggregation imports
from .models import Lead, LeadDocument, LeadStage, AuditLog, Team, User, Account, Contact, Deal, Task, Note, Notification, FollowUpReminder, TechPipeline, RevenueRecord
from .services import TransitionService
from rbac.models import Role  # Move here to fix NameError in UserSerializer

# --- Serializers ---

class UserSerializer(serializers.ModelSerializer):
    roles = serializers.StringRelatedField(many=True, read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Role.objects.all(), source='roles', write_only=True, required=False
    )
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'email', 'team', 'is_manager', 'is_superuser', 'view_all_leads', 'view_tech_pipeline', 'manage_tech_pipeline', 'can_create_leads', 'can_delete_leads', 'can_export_leads', 'roles', 'role_ids', 'revenue_threshold']
        read_only_fields = ['is_superuser']

class LeadDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadDocument
        fields = ['id', 'lead', 'name', 'file_path', 'uploaded_at']

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True)
    class Meta:
        model = AuditLog
        fields = '__all__'

class LeadSerializer(serializers.ModelSerializer):
    documents = LeadDocumentSerializer(many=True, read_only=True)
    audit_logs = AuditLogSerializer(many=True, read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True)
    lead_generator_name = serializers.CharField(source='lead_generator.username', read_only=True)
    tech_pipeline_id = serializers.PrimaryKeyRelatedField(source='tech_pipeline', read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    name = serializers.CharField(required=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    emirate = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['stage', 'assigned_team'] # Stage must be changed via transition endpoint

class TechPipelineSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.__str__', read_only=True)
    class Meta:
        model = TechPipeline
        fields = '__all__'
        read_only_fields = ['lead', 'created_at', 'updated_at']

from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000

# --- Views ---

class IsTeamOwnerOrManager(permissions.BasePermission):
    """
    Custom Permission: Users can only edit if they are Managers OR 
    if the lead is in their team's ownership.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return TransitionService.can_edit(request.user, obj)

class LeadIngestView(APIView):
    permission_classes = [permissions.AllowAny] # Public endpoint

    def post(self, request):
        data = request.data
        email = data.get('email')
        phone = data.get('phone')

        # Deduplication
        existing_lead = Lead.objects.filter(email=email).first() or \
                        Lead.objects.filter(phone=phone).first()

        if existing_lead:
            existing_lead.last_active = timezone.now()
            existing_lead.save()
            return Response({'message': 'Lead exists, updated timestamp.', 'id': existing_lead.id}, status=status.HTTP_200_OK)
        
        # Create new lead
        serializer = LeadSerializer(data=data)
        if serializer.is_valid():
            lead = serializer.save()
            return Response({'message': 'Lead created', 'id': lead.id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamOwnerOrManager]
    pagination_class = StandardResultsSetPagination

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.is_manager or getattr(user, 'can_create_leads', True)):
             raise permissions.PermissionDenied("You do not have permission to create leads.")
        
        # Check and set default reminder_date if missing (DateField: date only)
        reminder_date = serializer.validated_data.get('reminder_date')
        if not reminder_date:
            reminder_date = timezone.localdate() + timedelta(days=7)
            serializer.validated_data['reminder_date'] = reminder_date

        # Default lead_generator to the current user if not provided
        if 'lead_generator' not in serializer.validated_data:
            serializer.validated_data['lead_generator'] = user
            
        lead = serializer.save()
        
        # Create FollowUpReminder automatically
        if lead.assigned_to:
            FollowUpReminder.objects.create(
                lead=lead,
                assigned_to=lead.assigned_to,
                reminder_type='MANUAL' if self.request.data.get('reminder_date') else 'AUTO',
                due_date=reminder_date,
                message=f"Follow up with {lead.name}",
                status='PENDING'
            )

    def perform_update(self, serializer):
        # Update lead and sync Reminder
        old_reminder_date = serializer.instance.reminder_date
        old_assigned_to = serializer.instance.assigned_to
        
        lead = serializer.save()
        
        new_reminder_date = lead.reminder_date
        new_assigned_to = lead.assigned_to
        
        # If reminder date changed or assignee changed, update related PENDING reminders
        if (old_reminder_date != new_reminder_date) or (old_assigned_to != new_assigned_to):
            if lead.assigned_to and new_reminder_date:
                # Update existing pending reminder or create a new one
                reminder = FollowUpReminder.objects.filter(lead=lead, status='PENDING').first()
                if reminder:
                    reminder.due_date = new_reminder_date
                    reminder.assigned_to = lead.assigned_to
                    reminder.save()
                else:
                    FollowUpReminder.objects.create(
                        lead=lead,
                        assigned_to=lead.assigned_to,
                        reminder_type='MANUAL',
                        due_date=new_reminder_date,
                        message=f"Follow up with {lead.name}",
                        status='PENDING'
                    )

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_superuser or user.is_manager or getattr(user, 'can_delete_leads', False)):
             raise permissions.PermissionDenied("You do not have permission to delete leads.")
        instance.delete()

    def get_queryset(self):
        user = self.request.user
        queryset = Lead.objects.all()
        
        # RBAC: If not admin/manager/view_all, limit to assigned
        if not (user.is_superuser or user.is_manager or getattr(user, 'view_all_leads', False)):
            queryset = queryset.filter(assigned_to=user)

        # Filters
        status_param = self.request.query_params.get('status')
        if status_param == 'open':
            queryset = queryset.exclude(stage__in=['CLOSED', 'REJECTED'])
        elif status_param == 'closed':
            queryset = queryset.filter(stage__in=['CLOSED', 'REJECTED'])
            
        team_param = self.request.query_params.get('team')
        if team_param:
            queryset = queryset.filter(assigned_team=team_param)

        # Unassigned Filter
        unassigned_param = self.request.query_params.get('unassigned')
        if unassigned_param == 'true':
            queryset = queryset.filter(assigned_to__isnull=True)

        # Assigned Filter
        assigned_param = self.request.query_params.get('assigned')
        if assigned_param == 'true':
            queryset = queryset.filter(assigned_to__isnull=False)

        # New Today Filter
        new_today_param = self.request.query_params.get('new_today')
        if new_today_param == 'true':
            today = timezone.localdate()
            start_of_today = timezone.make_aware(datetime.combine(today, datetime.min.time()))
            end_of_today = timezone.make_aware(datetime.combine(today, datetime.max.time()))
            queryset = queryset.filter(created_at__range=(start_of_today, end_of_today))

        # Reminder Date Filter (DateField — simple exact match)
        reminder_date_param = self.request.query_params.get('reminder_date')
        if reminder_date_param:
            try:
                parsed_date = datetime.strptime(reminder_date_param, '%Y-%m-%d').date()
                queryset = queryset.filter(reminder_date=parsed_date)
            except ValueError:
                pass # Ignore invalid date format

        # Sorting
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering:
            queryset = queryset.order_by(ordering)

        # Search
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                models.Q(name__icontains=search_query) |
                models.Q(email__icontains=search_query) |
                models.Q(phone__icontains=search_query)
            )

        # Optimise: fetch all related data in a few queries instead of N+1
        # This is a read-only optimisation — no data is written or changed.
        queryset = queryset.select_related(
            'assigned_to',
            'lead_generator',
            'tech_pipeline',
        ).prefetch_related(
            'documents',
            Prefetch('audit_logs', queryset=AuditLog.objects.select_related('actor')),
        )

        return queryset

    @action(detail=False, methods=['get'])
    def export_xlsx(self, request):
        user = request.user
        if not (user.is_superuser or user.is_manager or getattr(user, 'can_export_leads', False)):
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = self.get_queryset()
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Leads Export"
        
        # Headers
        headers = [
            'ID', 'Name', 'Company Name', 'Emirate', 'Address', 'Email', 
            'Phone Number', 'Status', 'Stage', 'Lead Generator', 
            'Assigned To', 'Created Date', 'Create Time', 
            'Service Requested', 'Follow up Reminder (latest)', 'Remarks'
        ]
        ws.append(headers)
        
        for lead in queryset:
            # Handle timezone
            local_created_at = timezone.localtime(lead.created_at)
            created_date = local_created_at.date().strftime('%Y-%m-%d')
            created_time = local_created_at.time().strftime('%H:%M:%S')
            
            # Follow up reminder date (DateField - date only)
            reminder_val = ''
            if lead.reminder_date:
                reminder_val = lead.reminder_date.strftime('%Y-%m-%d')

            ws.append([
                lead.id,
                lead.name,
                lead.company_name or '',
                lead.emirate or '',
                lead.address or '',
                lead.email or '',
                lead.phone or '',
                lead.status,
                lead.stage,
                lead.lead_generator.name if lead.lead_generator and getattr(lead.lead_generator, 'name', None) else (lead.lead_generator.username if lead.lead_generator else ''),
                lead.assigned_to.name if lead.assigned_to and getattr(lead.assigned_to, 'name', None) else (lead.assigned_to.username if lead.assigned_to else ''),
                created_date,
                created_time,
                lead.tech_requirements or '',
                reminder_val,
                lead.remarks or ''
            ])
        
        # Determine dynamic filename
        is_new_today = request.query_params.get('new_today') == 'true'
        base_name = "new leads" if is_new_today else "all leads"
        date_str = timezone.now().strftime('%Y-%m-%d')
        filename = f"{base_name} - {date_str}.xlsx"
        
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        wb.save(response)
        
        return response


    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        is_manager = getattr(request.user, 'is_manager', False)
        is_superuser = getattr(request.user, 'is_superuser', False)
        if not (is_manager or is_superuser):
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        lead_ids = request.data.get('lead_ids', [])
        user_id = request.data.get('user_id')
        
        if not lead_ids or not user_id:
             return Response({'error': 'lead_ids and user_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            leads = Lead.objects.filter(id__in=lead_ids)
            count = leads.count()
            
            # Update leads
            leads.update(assigned_to=user)
            
            # Create notifications for each lead
            for lead in leads:
                Notification.objects.create(
                    recipient=user,
                    sender=request.user,
                    message=f"You have been assigned a new lead: {lead.name}",
                    lead=lead
                )
                
            return Response({'message': f'Assigned {count} leads to {user.username}'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        lead = self.get_object()
        new_stage = request.data.get('stage')
        notes = request.data.get('notes', '')

        if not new_stage:
            return Response({'error': 'New stage is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Basic validation (optional: check if transition is allowed)
        
        TransitionService.change_stage(lead, new_stage, request.user, notes)
        return Response(LeadSerializer(lead).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        # Only Managers or Team Leads should assign
        if not getattr(request.user, 'is_manager', False):
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        lead = self.get_object()
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
            lead.assigned_to = user
            lead.save()
            
            # Create notification
            Notification.objects.create(
                recipient=user,
                sender=request.user,
                message=f"You have been assigned a new lead: {lead.name}",
                lead=lead
            )
            
            return Response({'message': 'Assigned successfully'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'])
    def update_reminder(self, request, pk=None):
        user = request.user
        lead = self.get_object()
        
        # Check permissions - must be assigned, manager, or superuser
        if not (user.is_superuser or user.is_manager or lead.assigned_to == user):
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        new_date_str = request.data.get('reminder_date')
        
        if new_date_str:
            # Set the new reminder date (DateField — date only)
            try:
                new_reminder_date = datetime.strptime(new_date_str[:10], '%Y-%m-%d').date()

                lead.reminder_date = new_reminder_date
                lead.save(update_fields=['reminder_date', 'updated_at'])
                
                # Dismiss previous pending reminders for this lead
                FollowUpReminder.objects.filter(lead=lead, status='PENDING').update(status='DISMISSED')
                
                # Create a new FollowUpReminder object
                due_datetime = timezone.make_aware(datetime.combine(new_reminder_date, datetime.min.time().replace(hour=9)))
                if lead.assigned_to:
                    FollowUpReminder.objects.create(
                        lead=lead,
                        assigned_to=lead.assigned_to,
                        reminder_type='MANUAL',
                        due_date=due_datetime,
                        message=f"Follow up with {lead.name}",
                        status='PENDING'
                    )
                
                # Log Activity
                AuditLog.objects.create(
                    lead=lead,
                    actor=user,
                    action='REMINDER_UPDATED',
                    notes=f"Reminder updated to {new_reminder_date.strftime('%Y-%m-%d')}"
                )
                
                return Response({'status': 'Reminder updated successfully'})
            except ValueError as e:
                return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Stop Reminding
            lead.reminder_date = None
            lead.save(update_fields=['reminder_date', 'updated_at'])
            
            # Dismiss pending reminders
            FollowUpReminder.objects.filter(lead=lead, status='PENDING').update(status='DISMISSED')
            
            # Log Activity
            AuditLog.objects.create(
                lead=lead,
                actor=user,
                action='REMINDER_STOPPED',
                notes='Follow-up reminder stopped/cleared.'
            )
            
            return Response({'status': 'Reminder stopped successfully'})

class LeadDocumentViewSet(viewsets.ModelViewSet):
    queryset = LeadDocument.objects.all()
    serializer_class = LeadDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        file_obj = self.request.data.get('file_path')
        if file_obj:
            serializer.save(name=file_obj.name)
        else:
            serializer.save()

class NoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_full_name = serializers.CharField(source='author.name', read_only=True)
    class Meta:
        model = Note
        fields = '__all__'
        read_only_fields = ['author', 'created_at']

class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.select_related('author').all()
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Note.objects.select_related('author')
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return qs.filter(lead_id=lead_id).order_by('-created_at')
        return qs.all().order_by('-created_at')

    def perform_create(self, serializer):
        note = serializer.save(author=self.request.user)
        # Log note creation in the Activity feed
        from .models import AuditLog
        AuditLog.objects.create(
            lead=note.lead,
            actor=self.request.user,
            action="Note Added",
            notes=note.content[:100]  # First 100 chars as summary
        )

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = '__all__'

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_manager:
            return Account.objects.all()
        return Account.objects.filter(owner=user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_manager:
            return Contact.objects.all()
        return Contact.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

from rbac.models import Role

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        
        # Start with base queryset based on permissions
        if user.is_superuser or user.is_manager:
            queryset = User.objects.all()
        else:
            queryset = User.objects.filter(id=user.id)
        
        # Filter by team if query parameter is provided
        team_param = self.request.query_params.get('team')
        if team_param:
            queryset = queryset.filter(team=team_param)
        
        return queryset.order_by('username')

    def destroy(self, request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.team == 'ADMIN'):
            raise exceptions.PermissionDenied("Only the Admin team can delete users.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def onboard(self, request):
        if not (request.user.is_superuser or request.user.is_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
        full_name = request.data.get('full_name', '')
        username = request.data.get('username')
        email = request.data.get('email')
        team = request.data.get('team')
        is_manager = request.data.get('is_manager', False)  # Capture is_manager flag
        
        if not all([full_name, username, email, team]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(username=username).exists():
             return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password='password123',
                name=full_name,
                team=team,
                is_manager=is_manager # Set manager status
            )
            
            # Assign Manager Role if applicable (Ensure 'Manager' role exists or handle gracefully)
            if is_manager:
                manager_role = Role.objects.filter(name='Manager').first()
                if manager_role:
                    user.roles.add(manager_role)

            return Response({'message': f'User {username} created successfully', 'id': user.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not all([old_password, new_password, confirm_password]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
             return Response({'error': 'New passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'error': 'Incorrect old password'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_threshold(self, request, pk=None):
        """
        Admin only: Update the revenue threshold for a specific user.
        """
        if not (request.user.is_superuser or request.user.is_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
        user = self.get_object()
        threshold = request.data.get('threshold')
        
        try:
            user.revenue_threshold = float(threshold)
            user.save()
            return Response({'message': f'Threshold updated for {user.username}', 'threshold': user.revenue_threshold})
        except (ValueError, TypeError):
             return Response({'error': 'Invalid threshold value'}, status=status.HTTP_400_BAD_REQUEST)

from django.db.models import Count, Sum

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Throttle Stagnation Check: only run once per hour per user
        from django.core.cache import cache
        from .services import StagnationService
        cache_key = f'stagnation_check_{user.id}'
        stagnant_count = cache.get(cache_key)
        if stagnant_count is None:
            stagnant_count = StagnationService.check_and_alert(user)
            cache.set(cache_key, stagnant_count, 3600)  # Cache for 1 hour

        # Define base querysets based on RBAC
        if user.is_superuser or user.is_manager:
            leads = Lead.objects.all()
            deals = Deal.objects.all()
            tasks = Task.objects.all()
        else:
            leads = Lead.objects.filter(assigned_to=user)
            deals = Deal.objects.filter(owner=user)
            tasks = Task.objects.filter(owner=user)

        # Aggregations
        # Use more efficient counts where possible
        total_leads_count = leads.count()
        total_deals_count = deals.count()
        total_tasks_count = tasks.count()
        
        lead_stats = leads.values('stage').annotate(count=Count('id'))
        deal_stats = deals.values('stage').annotate(count=Count('id'), total_amount=Sum('amount'))
        task_stats = tasks.values('status').annotate(count=Count('id'))

        # Recent & Upcoming
        today = timezone.localdate()
        current_month = today.month
        current_year = today.year
        
        start_of_today = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        end_of_today = timezone.make_aware(datetime.combine(today, datetime.max.time()))
        
        # Admin/User KPIs
        open_leads_count = leads.exclude(stage__in=[LeadStage.DELIVERED, LeadStage.LOST, LeadStage.ON_HOLD]).count()
        completed_leads_count = leads.filter(stage=LeadStage.DELIVERED).count()
        deals_closing_month = deals.filter(closing_date__month=current_month, closing_date__year=current_year).count()
        new_leads_today = leads.filter(created_at__range=(start_of_today, end_of_today)).count()
        unassigned_leads = leads.filter(assigned_to__isnull=True).count()

        todays_tasks = tasks.filter(deadline__date=today).order_by('priority')[:5]
        recent_leads = leads.order_by('-created_at')[:5]
        recent_completed_leads = leads.filter(stage=LeadStage.DELIVERED).order_by('-updated_at')[:5]
        today_reminders_count = leads.filter(reminder_date=today).count()

        # Prepare response data
        data = {
            'leads_by_stage': {item['stage']: item['count'] for item in lead_stats},
            'deals_by_stage': {item['stage']: item['count'] for item in deal_stats},
            'deals_amount_by_stage': {item['stage']: item['total_amount'] or 0 for item in deal_stats},
            'tasks_by_status': {item['status']: item['count'] for item in task_stats},
            'total_leads': total_leads_count,
            'total_deals': total_deals_count,
            'total_tasks': total_tasks_count,
            'open_leads': open_leads_count,
            'completed_leads': completed_leads_count,
            'deals_closing_this_month': deals_closing_month,
            'new_leads_today': new_leads_today,
            'unassigned_leads': unassigned_leads,
            'today_reminders_count': today_reminders_count,
            'todays_tasks': [{'id': t.id, 'subject': t.subject, 'priority': t.priority, 'status': t.status} for t in todays_tasks],
            'recent_leads': [{'id': l.id, 'name': l.name, 'stage': l.stage, 'created_at': l.created_at} for l in recent_leads],
            'recent_completed_leads': [{'id': l.id, 'name': l.name, 'stage': l.stage, 'updated_at': l.updated_at} for l in recent_completed_leads],
            'stagnant_leads_count': stagnant_count,
            'pending_reminders_count': FollowUpReminder.objects.filter(assigned_to=user, status='PENDING').count(),
        }
        return Response(data)

class DealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    owner_team = serializers.CharField(source='owner.team', read_only=True)
    
    class Meta:
        model = Task
        fields = ['id', 'subject', 'deadline', 'status', 'priority', 'deal', 'contact', 'lead', 'owner', 'description', 'created_at', 'owner_name', 'owner_team']

class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_manager:
            return Deal.objects.all()
        return Deal.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        owner_id = self.request.query_params.get('owner')
        if owner_id:
            return Task.objects.filter(owner_id=owner_id)
        
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return Task.objects.filter(lead_id=lead_id)

        if lead_id:
            return Task.objects.filter(lead_id=lead_id)

        # Default: Show only tasks assigned to the user
        return Task.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def send_reminder(self, request, pk=None):
        """Admin action to send a reminder notification to the task owner."""
        if not (request.user.is_superuser or request.user.is_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        task = self.get_object()
        if not task.owner:
            return Response({'error': 'Task has no owner assigned'}, status=status.HTTP_400_BAD_REQUEST)

        message = f"Reminder: You have a pending task '{task.subject}'"
        if task.deadline:
            message += f" due on {task.deadline}"

        Notification.objects.create(
            recipient=task.owner,
            sender=request.user,
            message=message,
            task=task
        )
        return Response({'message': f'Reminder sent to {task.owner.username}'})


class ReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or request.user.is_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        timeframe = request.query_params.get('timeframe', 'monthly')
        today = timezone.localdate()
        
        # Determine Date Range
        if timeframe == 'daily':
            start_date = today
            trunc_func = TruncDay
        elif timeframe == 'weekly':
            start_date = today - timedelta(days=7)
            trunc_func = TruncDay
        elif timeframe == 'monthly':
            start_date = today - timedelta(days=30)
            trunc_func = TruncDay 
        elif timeframe == 'quarterly':
            start_date = today - timedelta(days=90)
            trunc_func = TruncDay # Or TruncWeek? TruncDay is smoother
        elif timeframe == 'yearly':
            start_date = today - timedelta(days=365)
            trunc_func = TruncMonth
        else:
            start_date = today - timedelta(days=30)
            trunc_func = TruncDay

        # Base Querysets
        leads = Lead.objects.filter(created_at__gte=start_date)
        
        # Deals Filter: Use closing_date OR updated_at if WON
        deals = Deal.objects.filter(
            stage='WON'
        ).filter(
            Q(closing_date__gte=start_date) | 
            Q(closing_date__isnull=True, updated_at__gte=start_date)
        )
        
        all_deals = Deal.objects.filter(created_at__gte=start_date) # For conversion rate logic

        # --- Summary Cards ---
        total_leads = leads.count()
        # USER REQUEST: "leads in the delivered stage in the pipeline are said to be completed"
        # So "Deals Won" metric should basically be "Delivered Leads"
        transferred_leads = leads.filter(stage=LeadStage.DELIVERED)
        total_deals_won = transferred_leads.count() 
        
        # Revenue still comes from Deals for now, assuming DELIVERED leads have corresponding Won Deals.
        total_revenue = deals.aggregate(val=Sum('amount'))['val'] or 0
        
        # Conversion Rate (Leads created in period that are now WON? Or just won count / lead count?)
        # Simple method: Won Deals / Total Leads * 100 (in this period)
        # Note: This is an approximation as deals won today might be from leads created months ago.
        # But for "Activity Report" it's acceptable. 
        conversion_rate = (total_deals_won / total_leads * 100) if total_leads > 0 else 0

        # Re-format for frontend
        line_chart_labels = []
        line_chart_leads = []
        line_chart_revenue = []

        # --- Chart 1: Acquisition & Revenue Over Time ---
        # Group by Created Date for Leads
        if timeframe == 'daily':
             # For daily view, maybe show single point for today
             line_chart_labels = [today.strftime('%Y-%m-%d')]
             line_chart_leads = [leads.count()]
             line_chart_revenue = [deals.aggregate(s=Sum('amount'))['s'] or 0]
        else:
            lead_trends = leads.annotate(date=trunc_func('created_at')).values('date').annotate(count=Count('id')).order_by('date')
            
            # Use Coalesce to fallback to updated_at if closing_date is null
            deal_trends = deals.annotate(
                effective_date=Coalesce('closing_date', 'updated_at', output_field=models.DateField())
            ).annotate(
                date=trunc_func('effective_date')
            ).values('date').annotate(amount=Sum('amount')).order_by('date')
            
            # Use a map to merge
            stats_map = {}
            for item in lead_trends:
                d = item['date'].strftime('%Y-%m-%d')
                if d not in stats_map: stats_map[d] = {'leads': 0, 'revenue': 0}
                stats_map[d]['leads'] = item['count']
                
            for item in deal_trends:
                d = item['date'].strftime('%Y-%m-%d') if item['date'] else 'N/A'
                if d == 'N/A': continue
                if d not in stats_map: stats_map[d] = {'leads': 0, 'revenue': 0}
                stats_map[d]['revenue'] = item['amount']
            
            # Sort by date
            sorted_dates = sorted(stats_map.keys())
            line_chart_labels = sorted_dates
            line_chart_leads = [stats_map[d]['leads'] for d in sorted_dates]
            line_chart_revenue = [stats_map[d]['revenue'] for d in sorted_dates]

        # --- Chart 2: Lead Stage Distribution (Doughnut) ---
        stage_stats = leads.values('stage').annotate(count=Count('id')).order_by('count')
        
        # --- Chart 3: Team Performance (Bar) ---
        # Top 10 performing users in this period
        # Optimized with annotations to avoid N+1
        from django.db.models import OuterRef, Subquery
        
        # Subquery for revenue (Won deals in timeframe)
        won_deals_subquery = Deal.objects.filter(
            owner=OuterRef('pk'),
            stage='WON'
        ).filter(
            Q(closing_date__gte=start_date) | 
            Q(closing_date__isnull=True, updated_at__gte=start_date)
        ).values('owner').annotate(
            total=Sum('amount')
        ).values('total')

        # Subquery for delivered leads count
        delivered_leads_subquery = Lead.objects.filter(
            assigned_to=OuterRef('pk'),
            stage=LeadStage.DELIVERED,
            updated_at__gte=start_date
        ).values('assigned_to').annotate(
            total=Count('id')
        ).values('total')

        # Subquery for assigned leads count
        assigned_leads_subquery = Lead.objects.filter(
            assigned_to=OuterRef('pk'),
            created_at__gte=start_date
        ).values('assigned_to').annotate(
            total=Count('id')
        ).values('total')

        users_stats = User.objects.filter(
            is_active=True, 
            team__in=['SALES', 'OPERATIONS']
        ).annotate(
            revenue=Subquery(won_deals_subquery, output_field=models.DecimalField()),
            deals=Subquery(delivered_leads_subquery, output_field=models.IntegerField()),
            leads=Subquery(assigned_leads_subquery, output_field=models.IntegerField()),
        ).values('username', 'leads', 'deals', 'revenue').order_by('-revenue')[:10]

        team_performance = [
            {
                'username': item['username'],
                'leads': item['leads'] or 0,
                'deals': item['deals'] or 0,
                'revenue': item['revenue'] or 0
            } for item in users_stats
        ]


        data = {
            'summary': {
                'total_leads': total_leads,
                'total_deals': total_deals_won,
                'total_revenue': total_revenue,
                'conversion_rate': round(conversion_rate, 2)
            },
            'charts': {
                'line': {
                    'labels': line_chart_labels,
                    'leads': line_chart_leads,
                    'revenue': line_chart_revenue
                },
                'doughnut': {
                    'labels': [item['stage'] for item in stage_stats],
                    'data': [item['count'] for item in stage_stats]
                },
                'bar': {
                    'labels': [item['username'] for item in team_performance],
                    'leads': [item['leads'] for item in team_performance],
                    'deals': [item['deals'] for item in team_performance]
                }
            }
        }
        
        return Response(data)

class DailyActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or request.user.is_manager):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        date_str = request.query_params.get('date')
        if not date_str:
            date_str = timezone.now().strftime('%Y-%m-%d')
        
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch Audit Logs for that day (Lead Stage Changes)
        activities = AuditLog.objects.filter(
            timestamp__date=date,
            action='Stage Change'
        ).select_related('lead', 'actor').order_by('-timestamp')

        data = []
        for activity in activities:
            data.append({
                'id': activity.id,
                'lead_name': activity.lead.name,
                'lead_id': activity.lead.id,
                'from_stage': activity.from_stage,
                'to_stage': activity.to_stage,
                'actor_name': activity.actor.username if activity.actor else 'System',
                'timestamp': activity.timestamp,
                'notes': activity.notes
            })
        
        return Response(data)

    def post(self, request):
        # Handle Export (using POST or GET with 'export' param, let's use a separate endpoint or param? 
        # Plan said endpoint. Let's support export via GET with ?export=true for simplicity in downloading)
        # Re-implementing logic in GET because browser download is easier with GET
        return Response({'message': 'Use GET with ?export=true'})



class NotificationSerializer(serializers.ModelSerializer):
    task_subject = serializers.CharField(source='task.subject', read_only=True)
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    lead_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at', 'task', 'task_subject', 'lead', 'lead_name', 'sender', 'sender_name']
        read_only_fields = ['recipient', 'sender', 'message', 'created_at', 'task', 'lead']

    def get_lead_name(self, obj):
        if obj.lead:
             return obj.lead.name
        return None

class RevenueStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        """
        Get revenue statistics for a specific user.
        """
        user = request.user
        target_user_id = int(pk) if pk else user.id
        
        # Access Control: Only admins or the user themselves can view stats
        if target_user_id != user.id and not (user.is_superuser or user.is_manager):
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
             
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
        today = timezone.localdate()
        current_month = today.month
        current_year = today.year
        
        # 1. Current Month Revenue
        current_month_revenue = RevenueRecord.objects.filter(
            user=target_user,
            month=current_month,
            year=current_year
        ).aggregate(total=Sum('amount'))['total'] or 0.00
        
        # 2. Threshold
        threshold = float(target_user.revenue_threshold)
        
        # 3. Progress
        progress_percentage = (float(current_month_revenue) / threshold * 100) if threshold > 0 else 0
        if progress_percentage > 100:
            progress_percentage = 100
        elif progress_percentage < 0:
            progress_percentage = 0
            
        # 4. Incentive (10% if threshold met)
        incentive_eligibility = float(current_month_revenue) >= threshold
        incentive_amount = float(current_month_revenue) * 0.10 if incentive_eligibility else 0.00
        
        # 5. Monthly Breakdown (Last 6 months)
        monthly_stats = []
        for i in range(5, -1, -1):
            date = today - timedelta(days=i*30) # Approx
            m = date.month
            y = date.year
            revenue = RevenueRecord.objects.filter(
                user=target_user,
                month=m,
                year=y
            ).aggregate(total=Sum('amount'))['total'] or 0.00
            
            monthly_stats.append({
                'month': date.strftime('%b'),
                'year': y,
                'revenue': revenue
            })
            
        data = {
            'username': target_user.username,
            'current_month_revenue': current_month_revenue,
            'threshold': threshold,
            'progress_percentage': round(progress_percentage, 1),
            'incentive_amount': round(incentive_amount, 2),
            'target_met': incentive_eligibility,
            'monthly_history': monthly_stats
        }
        
        return Response(data)



class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'message': 'Marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'count': count})
class TeamsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        teams = [{"value": choice[0], "label": choice[1]} for choice in Team.choices]
        return Response(teams)
class FollowUpReminderSerializer(serializers.ModelSerializer):
    lead_name = serializers.ReadOnlyField(source='lead.__str__')
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True)
    
    class Meta:
        model = FollowUpReminder
        fields = '__all__'
        read_only_fields = ['created_at', 'completed_at']

class ReminderViewSet(viewsets.ModelViewSet):
    queryset = FollowUpReminder.objects.all()
    serializer_class = FollowUpReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = FollowUpReminder.objects.all()
        
        # Managers see all, others see assigned
        if not (user.is_superuser or user.is_manager):
            qs = qs.filter(assigned_to=user)
            
        # Filters
        status_param = self.request.query_params.get('status')
        if status_param:
            if status_param != 'all':
                qs = qs.filter(status=status_param)

        filter_param = self.request.query_params.get('filter')
        # Use localdate to correctly handle timezone
        today = timezone.localdate()
        if filter_param == 'today':
            qs = qs.filter(due_date__date=today)
        elif filter_param == 'overdue':
             qs = qs.filter(due_date__lt=timezone.now())
        elif filter_param == 'upcoming':
             qs = qs.filter(due_date__gt=timezone.now())
        elif filter_param == 'completed':
             qs = qs.filter(status='COMPLETED')

        date_param = self.request.query_params.get('date')
        if date_param:
            try:
                target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                qs = qs.filter(due_date__date=target_date)
            except ValueError:
                pass
            
        return qs.order_by('due_date')

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        reminder = self.get_object()
        reminder.is_read = True
        reminder.save()
        return Response({'message': 'Reminder marked as read'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        reminder = self.get_object()
        reminder.status = 'COMPLETED'
        reminder.is_read = True
        reminder.completed_at = timezone.now()
        reminder.save()
        return Response({'message': 'Reminder completed'})

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        reminder = self.get_object()
        reminder.status = 'DISMISSED'
        reminder.is_read = True
        reminder.save()
        return Response({'message': 'Reminder dismissed'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = self.request.user
        qs = FollowUpReminder.objects.all()
        if not (user.is_superuser or user.is_manager):
             qs = qs.filter(assigned_to=user)
        
        today = timezone.localdate()
        
        total_pending = qs.filter(status='PENDING').count()
        unread_count = qs.filter(status='PENDING', is_read=False).count()
        overdue = qs.filter(status='PENDING', due_date__lt=timezone.now()).count()
        today_count = qs.filter(status='PENDING', due_date__date=today).count()
        upcoming = qs.filter(status='PENDING', due_date__gt=timezone.now()).count()
        completed = qs.filter(status='COMPLETED').count()
        
        return Response({
            'total_pending': total_pending,
            'unread_count': unread_count,
            'overdue': overdue,
            'today': today_count,
            'upcoming': upcoming,
            'completed': completed
        })

class TechPipelineViewSet(viewsets.ModelViewSet):
    queryset = TechPipeline.objects.all()
    serializer_class = TechPipelineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Logic: Visible to Tech login, Admin login, or users with view_tech_pipeline permission
        if (
            user.is_superuser or 
            user.is_manager or 
            getattr(user, 'team', 'SALES') in [Team.ADMIN, Team.TECH] or 
            getattr(user, 'view_tech_pipeline', False) or 
            getattr(user, 'manage_tech_pipeline', False)
        ):
            return TechPipeline.objects.all().order_by('-updated_at')
        return TechPipeline.objects.none()

    def perform_create(self, serializer):
        # Usually created via Signal, but if manual:
        if not self.can_edit(self.request.user):
            raise permissions.PermissionDenied("You do not have permission to manage the Tech Pipeline.")
        serializer.save()

    def perform_update(self, serializer):
        if not self.can_edit(self.request.user):
            raise permissions.PermissionDenied("You do not have permission to manage the Tech Pipeline.")
        serializer.save()

    def can_edit(self, user):
        return (
            user.is_superuser or 
            user.is_manager or 
            getattr(user, 'team', 'SALES') in [Team.ADMIN, Team.TECH] or 
            getattr(user, 'manage_tech_pipeline', False)
        )

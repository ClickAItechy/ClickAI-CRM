from rest_framework import serializers, viewsets, status, permissions, filters
import csv
from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models.functions import TruncDay, TruncMonth, TruncYear, Coalesce
from django.db.models import Count, Sum, F, ExpressionWrapper, FloatField, Q
from django.db import models
from django.db.models import Count, Sum # Added aggregation imports
from .models import Lead, LeadDocument, AuditLog, Team, User, Account, Contact, Deal, Task, Note, Notification, FollowUpReminder, TechPipeline, RevenueRecord
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
        fields = ['id', 'username', 'email', 'team', 'is_manager', 'view_all_leads', 'view_tech_pipeline', 'manage_tech_pipeline', 'can_create_leads', 'can_delete_leads', 'can_export_leads', 'roles', 'role_ids', 'revenue_threshold']

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

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.is_manager or getattr(user, 'can_create_leads', True)):
             raise permissions.PermissionDenied("You do not have permission to create leads.")
        # Auto-assign if not provided? Serializer might handle it or default to None.
        # But let's just save.
        serializer.save()

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
            queryset = queryset.filter(created_at__date=timezone.now().date())

        # Search
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search_query) |
                models.Q(last_name__icontains=search_query) |
                models.Q(email__icontains=search_query) |
                models.Q(phone__icontains=search_query)
            )

        return queryset

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        user = request.user
        if not (user.is_superuser or user.is_manager or getattr(user, 'can_export_leads', False)):
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="leads_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Stage', 'Team', 'Assigned To', 'Created At'])
        
        for lead in queryset:
            writer.writerow([
                lead.id,
                lead.first_name,
                lead.last_name,
                lead.email,
                lead.phone,
                lead.stage,
                lead.assigned_team,
                lead.assigned_to.username if lead.assigned_to else '',
                lead.created_at
            ])
            
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
                    message=f"You have been assigned a new lead: {lead.first_name} {lead.last_name}",
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
                message=f"You have been assigned a new lead: {lead.first_name} {lead.last_name}",
                lead=lead
            )
            
            return Response({'message': 'Assigned successfully'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

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
    class Meta:
        model = Note
        fields = '__all__'
        read_only_fields = ['author', 'created_at']

class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by lead if provided
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return Note.objects.filter(lead_id=lead_id).order_by('-created_at')
        return Note.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

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

        # Split Full Name
        names = full_name.split(' ', 1)
        first_name = names[0]
        last_name = names[1] if len(names) > 1 else ''
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password='password123',
                first_name=first_name,
                last_name=last_name,
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
        
        # Trigger Stagnation Check
        from .services import StagnationService
        stagnant_count = StagnationService.check_and_alert(user)

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
        lead_stats = leads.values('stage').annotate(count=Count('id'))
        deal_stats = deals.values('stage').annotate(count=Count('id'), total_amount=Sum('amount'))
        task_stats = tasks.values('status').annotate(count=Count('id'))

        # Recent & Upcoming
        today = timezone.now().date()
        current_month = today.month
        current_year = today.year
        
        # Admin/User KPIs
        open_leads_count = leads.exclude(stage__in=[LeadStage.DELIVERED, LeadStage.LOST]).count()
        completed_leads_count = leads.filter(stage=LeadStage.DELIVERED).count()
        deals_closing_month = deals.filter(closing_date__month=current_month, closing_date__year=current_year).count()
        new_leads_today = leads.filter(created_at__date=today).count()
        unassigned_leads = leads.filter(assigned_to__isnull=True).count()

        todays_tasks = tasks.filter(deadline__date=today).order_by('priority')[:5]
        recent_leads = leads.order_by('-created_at')[:5]
        recent_completed_leads = leads.filter(stage=LeadStage.DELIVERED).order_by('-updated_at')[:5]

        # Prepare response data
        data = {
            'leads_by_stage': {item['stage']: item['count'] for item in lead_stats},
            'deals_by_stage': {item['stage']: item['count'] for item in deal_stats},
            'deals_amount_by_stage': {item['stage']: item['total_amount'] or 0 for item in deal_stats},
            'tasks_by_status': {item['status']: item['count'] for item in task_stats},
            'total_leads': leads.count(),
            'total_deals': deals.count(),
            'total_tasks': tasks.count(),
            'open_leads': open_leads_count,
            'completed_leads': completed_leads_count,
            'deals_closing_this_month': deals_closing_month,
            'new_leads_today': new_leads_today,
            'unassigned_leads': unassigned_leads,
            'todays_tasks': [{'id': t.id, 'subject': t.subject, 'priority': t.priority, 'status': t.status} for t in todays_tasks],
            'recent_leads': [{'id': l.id, 'name': f"{l.first_name} {l.last_name}", 'stage': l.stage, 'created_at': l.created_at} for l in recent_leads],
            'recent_completed_leads': [{'id': l.id, 'name': f"{l.first_name} {l.last_name}", 'stage': l.stage, 'updated_at': l.updated_at} for l in recent_completed_leads],
            'stagnant_leads_count': stagnant_count, # Kept for backward compatibility if needed, but UI will likely ignore
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
        today = timezone.now().date()
        
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
        # Top 5 performing users in this period
        # Leads assigned vs Deals Won
        
        team_stats_qs = User.objects.filter(leads__created_at__gte=start_date).annotate(
            leads_count=Count('leads', distinct=True),
            # Ideally we want deals won by this user. 
            # Assuming Deal.owner is the closer.
        ).distinct()
        
        # This is tricky because we want to filter deals by date too. 
        # Easier to aggregation manually or subqueries.
        # Let's simple query: 
        
        team_performance = []
        users = User.objects.filter(is_active=True, team__in=['SALES', 'OPERATIONS']) # Filter relevant users
        for user in users:
            l_count = Lead.objects.filter(assigned_to=user, created_at__gte=start_date).count()
            
            # Count DELIVERED leads as "Deals" for the chart
            d_count = Lead.objects.filter(
                assigned_to=user, 
                stage=LeadStage.DELIVERED
            ).filter(
               updated_at__gte=start_date # When they were transferred
            ).count()
            
            rev = Deal.objects.filter(
                owner=user, 
                stage='WON'
            ).filter(
                Q(closing_date__gte=start_date) | 
                Q(closing_date__isnull=True, updated_at__gte=start_date)
            ).aggregate(s=Sum('amount'))['s'] or 0
            
            if l_count > 0 or d_count > 0:
                team_performance.append({
                    'username': user.username,
                    'leads': l_count,
                    'deals': d_count,
                    'revenue': rev
                })
        
        # Sort by Revenue des
        team_performance.sort(key=lambda x: x['revenue'], reverse=True)
        team_performance = team_performance[:10] # Top 10


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
                'lead_name': f"{activity.lead.first_name} {activity.lead.last_name}",
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
             return f"{obj.lead.first_name} {obj.lead.last_name}"
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
            
        today = timezone.now().date()
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

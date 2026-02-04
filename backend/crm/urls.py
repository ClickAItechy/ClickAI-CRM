from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LeadViewSet, LeadIngestView, LeadDocumentViewSet, AccountViewSet, ContactViewSet, UserViewSet, DealViewSet, TaskViewSet, DashboardStatsView, NoteViewSet, NotificationViewSet, TeamsListView, ReportsView, ReminderViewSet, DailyActivityView, TechPipelineViewSet, RevenueStatsView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'leads', LeadViewSet)
router.register(r'documents', LeadDocumentViewSet)
router.register(r'accounts', AccountViewSet)
router.register(r'contacts', ContactViewSet)
router.register(r'users', UserViewSet)
router.register(r'deals', DealViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'notes', NoteViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reminders', ReminderViewSet, basename='reminder')
router.register(r'tech-pipeline', TechPipelineViewSet)


urlpatterns = [
    path('', include(router.urls)),
    path('ingest/', LeadIngestView.as_view(), name='ingest'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('users/<int:pk>/revenue-stats/', RevenueStatsView.as_view(), name='revenue-stats'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('reports/daily-activities/', DailyActivityView.as_view(), name='daily-activities'),
    path('teams/', TeamsListView.as_view(), name='teams-list'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

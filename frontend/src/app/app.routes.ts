import { Routes } from '@angular/router';
import { LeadDetailComponent } from './features/leads/lead-detail/lead-detail.component';
import { KanbanBoardComponent } from './features/leads/kanban-board/kanban-board.component';
import { CreateLeadComponent } from './features/leads/create-lead/create-lead.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { ContactListComponent } from './features/contacts/contact-list/contact-list.component';
import { AccountListComponent } from './features/accounts/account-list/account-list.component';
import { DealListComponent } from './features/deals/deal-list/deal-list.component';
import { TaskListComponent } from './features/tasks/task-list/task-list.component';
import { DashboardComponent } from './features/reports/dashboard/dashboard.component';
import { TeamLeadListComponent } from './features/leads/team-lead-list/team-lead-list.component';
import { AdminSettingsComponent } from './features/admin/admin-settings.component';
import { MainLayoutComponent } from './core/layouts/main-layout/main-layout.component';
import { TeamMembersComponent } from './features/teams/team-members/team-members.component';
import { TeamsDashboardComponent } from './features/teams/teams-dashboard/teams-dashboard.component';
import { MemberTasksComponent } from './features/teams/member-tasks/member-tasks.component';
import { NotificationListComponent } from './features/notifications/notification-list/notification-list.component';
import { ReportsComponent } from './features/reports/reports/reports.component';

import { UserOnboardingComponent } from './features/admin/user-onboarding/user-onboarding.component';
import { ReminderListComponent } from './features/reminders/reminder-list/reminder-list.component';
import { UserListComponent } from './features/admin/user-list/user-list.component';
import { TechPipelineKanbanComponent } from './features/tech-pipeline/kanban/tech-pipeline-kanban.component';

export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'login', redirectTo: '', pathMatch: 'full' },
    {
        path: 'dashboard',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', component: DashboardComponent },
            { path: 'leads', component: TeamLeadListComponent },
            { path: 'leads/pipeline', component: KanbanBoardComponent },
            { path: 'leads/list', component: TeamLeadListComponent }, // Keep for backward compat/linking
            { path: 'leads/new', component: CreateLeadComponent },
            { path: 'leads/:id', component: LeadDetailComponent },
            { path: 'contacts', component: ContactListComponent },
            { path: 'accounts', component: AccountListComponent },
            { path: 'deals', component: DealListComponent },
            { path: 'tasks', component: TaskListComponent },
            { path: 'reminders', component: ReminderListComponent },
            { path: 'reports', component: ReportsComponent },
            { path: 'admin/settings', component: AdminSettingsComponent },
            { path: 'admin/users', component: UserListComponent },
            { path: 'admin/onboarding', component: UserOnboardingComponent },
            { path: 'teams', component: TeamsDashboardComponent },
            { path: 'teams/:teamName', component: TeamMembersComponent },
            { path: 'teams/:teamName/member/:memberId', component: MemberTasksComponent },
            { path: 'notifications', component: NotificationListComponent },
            { path: 'tech-pipeline', component: TechPipelineKanbanComponent }
        ]
    },

    { path: '**', redirectTo: '' }
];

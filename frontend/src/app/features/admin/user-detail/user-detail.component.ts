import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { TaskService, Task } from '../../../core/services/task.service';
import { ToastService } from '../../../core/services/toast.service';

interface UserDetail {
    id: number;
    username: string;
    name: string;
    email: string;
    team: string;
    is_manager: boolean;
    is_superuser: boolean;
    view_all_leads: boolean;
    view_tech_pipeline: boolean;
    manage_tech_pipeline: boolean;
    can_create_leads: boolean;
    can_delete_leads: boolean;
    can_export_leads: boolean;
    revenue_threshold: number;
    roles: string[];
}

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './user-detail.component.html',
    styleUrls: ['./user-detail.component.css']
})
export class UserDetailComponent implements OnInit {
    user: UserDetail | null = null;
    tasks: Task[] = [];
    loading = true;
    tasksLoading = true;
    saving = false;
    editing = false;
    canEdit = false;

    // Edit form model
    editModel: Partial<UserDetail> = {};

    teams = ['ADMIN', 'SALES', 'MARKETING', 'OPERATIONS', 'TECH'];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private adminService: AdminService,
        private authService: AuthService,
        private taskService: TaskService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        const currentUser = this.authService.currentUserValue;
        this.canEdit = currentUser?.is_superuser || currentUser?.is_manager || currentUser?.team === 'ADMIN';

        const userId = Number(this.route.snapshot.paramMap.get('id'));
        if (userId) {
            this.loadUser(userId);
            this.loadTasks(userId);
        }
    }

    loadUser(id: number) {
        this.loading = true;
        this.adminService.getUserById(id).subscribe({
            next: (data: UserDetail) => {
                this.user = data;
                this.loading = false;
            },
            error: () => {
                this.toastService.error('Failed to load user details');
                this.loading = false;
            }
        });
    }

    loadTasks(userId: number) {
        this.tasksLoading = true;
        this.taskService.getTasks({ owner: userId }).subscribe({
            next: (data: Task[]) => {
                this.tasks = data;
                this.tasksLoading = false;
            },
            error: () => {
                this.tasksLoading = false;
            }
        });
    }

    startEditing() {
        if (!this.user) return;
        this.editModel = { ...this.user };
        this.editing = true;
    }

    cancelEditing() {
        this.editing = false;
        this.editModel = {};
    }

    saveChanges() {
        if (!this.user) return;
        this.saving = true;

        const payload: any = {
            name: this.editModel.name,
            email: this.editModel.email,
            team: this.editModel.team,
            is_manager: this.editModel.is_manager,
            view_all_leads: this.editModel.view_all_leads,
            view_tech_pipeline: this.editModel.view_tech_pipeline,
            manage_tech_pipeline: this.editModel.manage_tech_pipeline,
            can_create_leads: this.editModel.can_create_leads,
            can_delete_leads: this.editModel.can_delete_leads,
            can_export_leads: this.editModel.can_export_leads,
        };

        this.adminService.updateUser(this.user.id, payload).subscribe({
            next: () => {
                this.toastService.success('User updated successfully');
                this.editing = false;
                this.saving = false;
                // Update local user object
                Object.assign(this.user!, payload);
            },
            error: () => {
                this.toastService.error('Failed to update user');
                this.saving = false;
            }
        });
    }

    saveThreshold() {
        if (!this.user || this.editModel.revenue_threshold == null) return;
        this.saving = true;

        this.adminService.updateThreshold(this.user.id, Number(this.editModel.revenue_threshold)).subscribe({
            next: () => {
                this.toastService.success('Threshold updated');
                this.user!.revenue_threshold = Number(this.editModel.revenue_threshold);
                this.saving = false;
            },
            error: () => {
                this.toastService.error('Failed to update threshold');
                this.saving = false;
            }
        });
    }

    goBack() {
        this.router.navigate(['/dashboard/admin/users']);
    }

    getInitials(): string {
        if (!this.user) return '?';
        const name = this.user.name || this.user.username;
        const initial = name.charAt(0).toUpperCase();
        return initial || 'U';
    }

    getFullName(): string {
        if (!this.user) return '';
        const name = this.user.name || this.user.username;
        return name || 'Unknown User';
    }

    getPriorityClass(priority: string): string {
        switch (priority) {
            case 'Urgent': return 'urgent';
            case 'High': return 'high';
            case 'Normal': return 'medium';
            case 'Low': return 'low';
            default: return '';
        }
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Completed': return 'completed';
            case 'In Progress': return 'in-progress';
            case 'Not Started': return 'not-started';
            case 'Deferred': return 'deferred';
            default: return '';
        }
    }
}

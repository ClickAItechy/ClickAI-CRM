import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { TeamService, Team, TeamMember } from '../../../core/services/team.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-task-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './task-list.component.html',
    styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
    tasks: any[] = [];
    searchTerm: string = '';
    filterType: string = 'All'; // New filter property
    isEditMode: boolean = false;
    editingTaskId: number | null = null;
    showModal: boolean = false;
    canManageTasks: boolean = false;
    currentUserId: number | null = null;

    // New/Edit Task Form
    newTask = {
        subject: '',
        description: '',
        deadline: '',
        owner: null as number | null,
        priority: 'Normal',
        status: 'Not Started'
    };

    teams: Team[] = [];
    teamMembersMap: Map<string, TeamMember[]> = new Map();
    selectedTeam: string = '';
    showTeamMembers: string | null = null;

    constructor(
        private http: HttpClient,
        private teamService: TeamService,
        private toastService: ToastService,
        private authService: AuthService
    ) {
        const user = this.authService.currentUserValue;
        this.canManageTasks = user?.is_manager || user?.is_superuser || false;
        this.currentUserId = user?.id;
    }

    ngOnInit() {
        this.loadTasks();
        this.loadTeams();
    }

    loadTasks() {
        this.http.get<any[]>(`${environment.apiUrl}/tasks/`).subscribe({
            next: (data) => this.tasks = data,
            error: (err) => console.error('Failed to load tasks', err)
        });
    }

    loadTeams() {
        this.teamService.getTeams().subscribe({
            next: (teams) => {
                this.teams = teams;
                // Pre-load members for all teams
                teams.forEach(team => {
                    this.teamService.getTeamMembers(team.value).subscribe(members => {
                        this.teamMembersMap.set(team.value, members);
                    });
                });
            },
            error: (err) => console.error('Failed to load teams', err)
        });
    }

    get filteredTasks() {
        let filtered = this.tasks;

        // 1. Text Search
        if (this.searchTerm) {
            filtered = filtered.filter(task =>
                task.subject.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                task.status.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (task.owner_name && task.owner_name.toLowerCase().includes(this.searchTerm.toLowerCase()))
            );
        }

        // 2. Category Filter
        const todayStr = new Date().toISOString().split('T')[0];

        switch (this.filterType) {
            case 'Due Today':
                filtered = filtered.filter(t => t.deadline && t.deadline.startsWith(todayStr));
                break;
            case 'Overdue':
                filtered = filtered.filter(t => {
                    if (!t.deadline || t.status === 'Completed') return false;
                    return t.deadline < new Date().toISOString();
                });
                break;
            case 'High Priority':
                filtered = filtered.filter(t => t.priority === 'High');
                break;
            case 'In Progress':
                filtered = filtered.filter(t => t.status === 'In Progress');
                break;
            case 'Completed':
                filtered = filtered.filter(t => t.status === 'Completed');
                break;
        }

        return filtered;
    }

    openModal(task?: any) {
        if (task) {
            this.isEditMode = true;
            this.editingTaskId = task.id;
            this.newTask = {
                subject: task.subject,
                description: task.description || '',
                deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
                owner: task.owner,
                priority: task.priority || 'Normal',
                status: task.status || 'Not Started'
            };
            this.selectedTeam = task.owner_team || '';
        } else {
            this.isEditMode = false;
            this.editingTaskId = null;
            this.resetForm();
        }
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.resetForm();
        this.showTeamMembers = null;
    }

    resetForm() {
        this.newTask = {
            subject: '',
            description: '',
            deadline: '',
            owner: null,
            priority: 'Normal',
            status: 'Not Started'
        };
        this.selectedTeam = '';
    }

    toggleTeamMembers(teamValue: string) {
        this.showTeamMembers = this.showTeamMembers === teamValue ? null : teamValue;
    }

    selectMember(member: TeamMember) {
        this.newTask.owner = member.id;
        this.selectedTeam = member.team;
    }

    getMemberName(teamValue: string, memberId: number | null): string {
        if (!memberId || !teamValue) return '';
        const members = this.teamMembersMap.get(teamValue);
        const member = members?.find(m => m.id === memberId);
        return member ? member.username : '';
    }

    onSubmit() {
        if (!this.newTask.subject || !this.newTask.owner || !this.newTask.deadline) {
            this.toastService.warning('Please fill in all required fields (Subject, Deadline, Assigned To)');
            return;
        }

        const request = this.isEditMode && this.editingTaskId
            ? this.http.patch(`${environment.apiUrl}/tasks/${this.editingTaskId}/`, this.newTask)
            : this.http.post(`${environment.apiUrl}/tasks/`, this.newTask);

        request.subscribe({
            next: () => {
                this.loadTasks();
                this.closeModal();
                this.toastService.success(this.isEditMode ? 'Task updated successfully' : 'Task created successfully');
            },
            error: (err) => {
                console.error('Failed to save task', err);
                this.toastService.error('Error saving task. Please try again.');
            }
        });
    }

    deleteTask(id: number) {
        Swal.fire({
            title: 'Delete Task?',
            text: 'Are you sure you want to delete this task? This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            backdrop: true,
            customClass: {
                popup: 'swal-custom-popup'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.http.delete(`${environment.apiUrl}/tasks/${id}/`).subscribe({
                    next: () => {
                        this.loadTasks();
                        this.toastService.success('Task deleted successfully');
                    },
                    error: (err) => {
                        console.error('Failed to delete task', err);
                        this.toastService.error('Failed to delete task');
                    }
                });
            }
        });
    }
}

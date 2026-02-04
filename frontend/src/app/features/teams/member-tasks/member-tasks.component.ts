import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TeamService } from '../../../core/services/team.service';
import { ToastService } from '../../../core/services/toast.service';

interface Task {
  id: number;
  subject: string;
  deadline: string | null;
  status: string;
  priority: string;
  description: string;
  owner_name?: string;
}

@Component({
  selector: 'app-member-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="member-tasks-container">
      <header class="page-header">
        <a [routerLink]="['/dashboard/teams', teamName]" class="back-link">← Back to {{ teamDisplayName }} Team</a>
        <h1>Tasks for {{ memberName | titlecase }}</h1>
        <p class="subtitle">{{ pendingTasks.length }} pending task(s)</p>
      </header>

      <div class="tasks-list" *ngIf="pendingTasks.length > 0; else noTasks">
        <div class="task-card" *ngFor="let task of pendingTasks" [class.overdue]="isOverdue(task)">
          <div class="task-header">
            <h3>{{ task.subject }}</h3>
            <span class="priority-badge" [class]="task.priority.toLowerCase()">{{ task.priority }}</span>
          </div>
          
          <p class="task-description" *ngIf="task.description">{{ task.description }}</p>
          
          <div class="task-meta">
            <span class="status">
              <i class="icon">📋</i> {{ task.status }}
            </span>
            <span class="due-date" *ngIf="task.deadline">
              <i class="icon">📅</i> Deadline: {{ task.deadline | date:'medium' }}
            </span>
          </div>
          
          <div class="task-actions">
            <button 
              class="reminder-btn" 
              (click)="sendReminder(task)"
              [disabled]="sendingReminder === task.id">
              <span *ngIf="sendingReminder !== task.id">🔔 Send Reminder</span>
              <span *ngIf="sendingReminder === task.id">Sending...</span>
            </button>
            <span class="reminder-success" *ngIf="reminderSent === task.id">
              ✓ Reminder Sent!
            </span>
          </div>
        </div>
      </div>

      <ng-template #noTasks>
        <div class="empty-state">
          <span class="empty-icon">✅</span>
          <h3>No Pending Tasks</h3>
          <p>This team member has no pending tasks at the moment.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .member-tasks-container {
      max-width: 900px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .back-link {
      color: #6366f1;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      display: inline-block;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0.5rem 0;
    }

    .subtitle {
      color: #64748b;
      margin: 0;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .task-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #6366f1;
      transition: transform 0.2s;
    }

    .task-card:hover {
      transform: translateX(4px);
    }

    .task-card.overdue {
      border-left-color: #ef4444;
      background: linear-gradient(to right, #fef2f2, white);
    }

    .task-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .task-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #1e293b;
    }

    .priority-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .priority-badge.high {
      background: #fee2e2;
      color: #dc2626;
    }

    .priority-badge.normal {
      background: #e0f2fe;
      color: #0284c7;
    }

    .priority-badge.low {
      background: #dcfce7;
      color: #16a34a;
    }

    .task-description {
      color: #64748b;
      font-size: 0.9rem;
      margin: 0 0 1rem;
      line-height: 1.5;
    }

    .task-meta {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .task-meta span {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #64748b;
      font-size: 0.875rem;
    }

    .task-meta .icon {
      font-style: normal;
    }

    .task-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }

    .reminder-btn {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border: none;
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .reminder-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    .reminder-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .reminder-success {
      color: #16a34a;
      font-weight: 500;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .empty-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #1e293b;
      margin: 0 0 0.5rem;
    }

    .empty-state p {
      color: #64748b;
      margin: 0;
    }
  `]
})
export class MemberTasksComponent implements OnInit {
  teamName = '';
  teamDisplayName = '';
  memberId = 0;
  memberName = '';
  tasks: Task[] = [];
  pendingTasks: Task[] = [];
  sendingReminder: number | null = null;
  reminderSent: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private teamService: TeamService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.teamName = params.get('teamName') || '';
      this.memberId = Number(params.get('memberId')) || 0;
      this.teamDisplayName = this.getTeamDisplayName(this.teamName);
      this.loadMemberTasks();
    });
  }

  getTeamDisplayName(name: string): string {
    const names: { [key: string]: string } = {
      'sales': 'Sales',
      'operations': 'Operations',
      'marketing': 'Marketing'
    };
    return names[name.toLowerCase()] || name;
  }

  loadMemberTasks(): void {
    this.teamService.getMemberTasks(this.memberId).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.pendingTasks = tasks.filter(t => t.status !== 'Completed');
        // Extract member name from the response (we'll need to fetch it)
        if (tasks.length > 0 && tasks[0].owner_name) {
          this.memberName = tasks[0].owner_name;
        } else {
          this.memberName = `Member #${this.memberId}`;
        }
      },
      error: (err) => console.error('Error loading tasks:', err)
    });
  }

  isOverdue(task: Task): boolean {
    if (!task.deadline) return false;
    return new Date(task.deadline) < new Date();
  }

  sendReminder(task: Task): void {
    this.sendingReminder = task.id;
    this.reminderSent = null;

    this.teamService.sendReminder(task.id).subscribe({
      next: () => {
        this.sendingReminder = null;
        this.reminderSent = task.id;
        setTimeout(() => {
          if (this.reminderSent === task.id) {
            this.reminderSent = null;
          }
        }, 3000);
      },
      error: (err) => {
        console.error('Error sending reminder:', err);
        this.sendingReminder = null;
        this.toastService.error('Failed to send reminder. Please try again.');
      }
    });
  }
}

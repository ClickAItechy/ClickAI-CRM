import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TeamService, TeamMember } from '../../../core/services/team.service';

@Component({
  selector: 'app-team-members',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="team-members-container">
      <header class="page-header">
        <h1>{{ teamDisplayName }} Team</h1>
        <p class="subtitle">View team members and their pending tasks</p>
      </header>

      <div class="members-grid" *ngIf="members.length > 0; else noMembers">
        <div class="member-card" *ngFor="let member of members">
          <div class="member-avatar">{{ getInitials(member.username) }}</div>
          <div class="member-info">
            <h3>{{ member.username | titlecase }}</h3>
            <p class="member-email">{{ member.email }}</p>
          </div>
          <div class="task-badge" [class.has-tasks]="getPendingCount(member) > 0">
            <span class="count">{{ getPendingCount(member) }}</span>
            <span class="label">Pending Tasks</span>
          </div>
          <a [routerLink]="['/dashboard/teams', teamName, 'member', member.id]" class="view-tasks-btn">
            View Tasks →
          </a>
        </div>
      </div>

      <ng-template #noMembers>
        <div class="empty-state">
          <span class="empty-icon">👥</span>
          <h3>No Team Members</h3>
          <p>There are no members assigned to the {{ teamDisplayName }} team yet.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .team-members-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 0.5rem;
    }

    .subtitle {
      color: #64748b;
      margin: 0;
    }

    .members-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .member-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .member-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
    }

    .member-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }

    .member-info h3 {
      margin: 0 0 0.25rem;
      font-size: 1.1rem;
      color: #1e293b;
    }

    .member-email {
      color: #64748b;
      font-size: 0.875rem;
      margin: 0 0 1rem;
    }

    .task-badge {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      background: #f1f5f9;
      margin-bottom: 1rem;
    }

    .task-badge.has-tasks {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    }

    .task-badge .count {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
    }

    .task-badge .label {
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .view-tasks-btn {
      display: inline-block;
      padding: 0.625rem 1.25rem;
      background: #6366f1;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .view-tasks-btn:hover {
      background: #4f46e5;
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
export class TeamMembersComponent implements OnInit {
  teamName = '';
  teamDisplayName = '';
  members: TeamMember[] = [];
  memberTaskCounts: Map<number, number> = new Map();

  constructor(
    private route: ActivatedRoute,
    private teamService: TeamService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.teamName = params.get('teamName') || '';
      this.teamDisplayName = this.getTeamDisplayName(this.teamName);
      this.loadMembers();
    });
  }

  getTeamDisplayName(name: string): string {
    // Capitalize first letter or use the name directly
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  loadMembers(): void {
    // We can use the team value directly if it's already uppercase in the URL
    // or just pass it as is if the backend handles it.
    // The backend choice for SALES is 'SALES', so we use uppercase.
    const apiTeamName = this.teamName.toUpperCase();

    this.teamService.getTeamMembers(apiTeamName).subscribe({
      next: (members) => {
        this.members = members;
        // Load task counts for each member
        this.members.forEach(member => {
          this.teamService.getMemberTasks(member.id).subscribe({
            next: (tasks) => {
              const pendingCount = tasks.filter(t => t.status !== 'Completed').length;
              this.memberTaskCounts.set(member.id, pendingCount);
            }
          });
        });
      },
      error: (err) => console.error('Error loading team members:', err)
    });
  }

  getPendingCount(member: TeamMember): number {
    return this.memberTaskCounts.get(member.id) || 0;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}

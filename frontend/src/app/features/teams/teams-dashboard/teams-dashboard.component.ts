import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeamService, Team } from '../../../core/services/team.service';

@Component({
    selector: 'app-teams-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="teams-dashboard">
      <header class="page-header">
        <h1>Company Teams</h1>
        <p class="subtitle">Select a team to view members and manage tasks</p>
      </header>

      <div class="teams-grid" *ngIf="teams.length > 0; else loading">
        <div class="team-card" *ngFor="let team of teams" [routerLink]="['/dashboard/teams', team.value]">
          <div class="team-icon">{{ getTeamIcon(team.value) }}</div>
          <div class="team-info">
            <h3>{{ team.label }}</h3>
            <p>View members and active workloads</p>
          </div>
          <div class="card-footer">
            <span>View Team Members</span>
            <span class="arrow">→</span>
          </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <p>Loading teams...</p>
        </div>
      </ng-template>
    </div>
  `,
    styles: [`
    .teams-dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .page-header {
      margin-bottom: 2.5rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.5rem;
    }

    .subtitle {
      color: #64748b;
      font-size: 1.1rem;
    }

    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
    }

    .team-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      border: 1px solid #e2e8f0;
    }

    .team-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border-color: #6366f1;
    }

    .team-icon {
      font-size: 2.5rem;
      margin-bottom: 1.5rem;
      width: 64px;
      height: 64px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
    }

    .team-card:hover .team-icon {
      background: #e0e7ff;
    }

    .team-info h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 0.5rem;
    }

    .team-info p {
      color: #64748b;
      font-size: 0.95rem;
      margin: 0 0 2rem;
    }

    .card-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #6366f1;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .arrow {
      transition: transform 0.2s;
    }

    .team-card:hover .arrow {
      transform: translateX(4px);
    }

    .loading-state {
      padding: 4rem;
      text-align: center;
      color: #64748b;
    }
  `]
})
export class TeamsDashboardComponent implements OnInit {
    teams: Team[] = [];

    constructor(private teamService: TeamService) { }

    ngOnInit(): void {
        this.teamService.getTeams().subscribe({
            next: (teams) => this.teams = teams,
            error: (err) => console.error('Error loading teams:', err)
        });
    }

    getTeamIcon(teamValue: string): string {
        const icons: { [key: string]: string } = {
            'SALES': '💼',
            'ADMIN': '🛡️',
            'MARKETING': '📢',
            'CONSULTANCY': '🤝',
            'OPERATIONS': '⚙️',
            'SUPPORT': '🎧'
        };
        return icons[teamValue] || '📁';
    }
}

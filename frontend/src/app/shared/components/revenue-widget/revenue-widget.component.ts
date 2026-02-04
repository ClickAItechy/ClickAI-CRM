import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface RevenueStats {
  username: string;
  current_month_revenue: number;
  threshold: number;
  progress_percentage: number;
  incentive_amount: number;
  target_met: boolean;
  monthly_history: any[];
}

@Component({
  selector: 'app-revenue-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue-widget.component.html',
  styles: [`
    :host { display: block; }
    .revenue-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid #edf2f7;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
      position: relative;
      margin-bottom: 1rem;
    }
    .revenue-card:hover { 
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border-color: #e2e8f0;
    }
    
    .grid-layout { 
      display: grid; 
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
    @media (min-width: 768px) {
      .grid-layout { grid-template-columns: 1.4fr 1fr; }
    }

    .main-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .header { margin-bottom: 0.25rem; }
    .title { 
      font-size: 0.75rem; 
      font-weight: 700; 
      color: #64748b; 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
      display: flex; 
      align-items: center; 
      gap: 0.375rem; 
    }
    
    .amount-display { display: flex; align-items: baseline; gap: 0.375rem; }
    .amount { font-size: 1.5rem; font-weight: 800; color: #0f172a; line-height: 1.2; }
    .threshold { font-size: 0.875rem; color: #94a3b8; font-weight: 500; }
    
    .progress-track {
      height: 6px;
      background: #f1f5f9;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #3b82f6;
      border-radius: 3px;
      transition: width 1s ease-in-out;
    }
    .progress-fill.target-met { background: #10b981; }

    .progress-label-row {
      display: flex;
      justify-content: space-between;
      margin-top: 0.375rem;
    }
    .label-xs { 
      font-size: 0.625rem; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.025em; 
      color: #94a3b8; 
    }
    .val-xs { font-size: 0.625rem; font-weight: 700; color: #64748b; }

    .side-section { 
      display: flex; 
      flex-direction: column; 
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    @media (min-width: 768px) {
      .side-section { 
        padding: 0 0 0 1.25rem;
        border-top: none;
        border-left: 1px solid #f1f5f9;
      }
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-label { font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .stat-value { font-size: 0.875rem; font-weight: 700; color: #1e293b; }
    .stat-value.success { color: #059669; }

    .incentive-badge {
      background: #f0fdf4; 
      color: #166534; 
      padding: 2px 8px; 
      border-radius: 9999px; 
      font-size: 0.625rem; 
      font-weight: 700;
      text-transform: uppercase;
    }
    .locked-label { font-size: 0.625rem; font-weight: 700; color: #cbd5e1; text-transform: uppercase; }

    .history-bars { 
      display: flex; 
      gap: 2px; 
      height: 24px; 
      align-items: flex-end; 
    }
    .bar { 
      width: 4px; 
      background: #f1f5f9; 
      border-radius: 1px 1px 0 0;
      transition: all 0.2s;
    }
    .bar:hover { background: #3b82f6; opacity: 1 !important; }

    .loading-state { height: 100px; color: #94a3b8; font-size: 0.75rem; font-weight: 500; }
    .spinning {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class RevenueWidgetComponent implements OnInit {
  stats: RevenueStats | null = null;
  loading = true;
  error = '';

  constructor(private http: HttpClient, private authService: AuthService) { }

  ngOnInit() {
    this.fetchStats();
  }

  fetchStats() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    this.http.get<RevenueStats>(`${environment.apiUrl}/users/${user.id}/revenue-stats/`).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch revenue stats', err);
        this.error = 'Could not load revenue data';
        this.loading = false;
      }
    });
  }
}

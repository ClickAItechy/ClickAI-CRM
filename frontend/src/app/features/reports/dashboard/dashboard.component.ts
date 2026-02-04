import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js/auto';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ReminderService } from '../../../core/services/reminder.service';


import { RevenueWidgetComponent } from '../../../shared/components/revenue-widget/revenue-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, RouterLink, RevenueWidgetComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: any = {};
  unreadCount = 0;
  reminderUnreadCount = 0;

  // Potential Revenue (Bar Chart)
  public revenueChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { position: 'bottom' }
    }
  };
  public revenueChartType: ChartType = 'bar';
  public revenueChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // Lead Health Overview (Doughnut)
  public leadHealthChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'right' }
    }
  } as any;
  public leadHealthChartType: ChartType = 'doughnut';
  public leadHealthChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };

  currentUser: any = {};
  isAdmin: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private reminderService: ReminderService
  ) {
    this.currentUser = this.authService.currentUserValue;
    this.isAdmin = this.currentUser?.is_manager || this.currentUser?.is_superuser || false;
  }

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/dashboard-stats/`).subscribe({
      next: (data) => {
        this.stats = data;
        this.initCharts();
      },
      error: (err) => console.error('Failed to load dashboard stats', err)
    });

    this.http.get<any>(`${environment.apiUrl}/notifications/unread_count/`).subscribe({
      next: (data) => this.unreadCount = data.count,
      error: (err) => console.error('Failed to load unread count', err)
    });

    // Fetch reminder unread count
    this.reminderService.getReminderStats().subscribe({
      next: (stats) => this.reminderUnreadCount = stats.unread_count,
      error: (err) => console.error('Failed to load reminder stats', err)
    });
  }

  initCharts() {
    // Revenue Chart
    const dealStages = Object.keys(this.stats.deals_amount_by_stage || {});
    const dealAmounts = Object.values(this.stats.deals_amount_by_stage || {}) as number[];

    this.revenueChartData = {
      labels: dealStages,
      datasets: [{
        data: dealAmounts,
        label: 'Revenue',
        backgroundColor: '#6366f1',
        borderRadius: 4
      }]
    };

    // Lead Health Chart
    const leadStages = Object.keys(this.stats.leads_by_stage || {});
    const leadCounts = Object.values(this.stats.leads_by_stage || {}) as number[];

    this.leadHealthChartData = {
      labels: leadStages,
      datasets: [{
        data: leadCounts,
        backgroundColor: [
          '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'
        ],
        hoverOffset: 4
      }]
    };

    this.leadHealthChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    } as any;
  }

  isSectionVisible(section: string): boolean {
    if (this.isAdmin) return true;
    switch (section) {
      case 'clients': return true;
      case 'bank_offers': return true;
      case 'tasks': return true;
      case 'reports': return false;
      case 'notifications': return true;
      case 'reminders': return true;
      case 'updates': return true;
      default: return false;
    }
  }
}

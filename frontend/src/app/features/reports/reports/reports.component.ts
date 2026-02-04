import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js/auto';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule, BaseChartDirective, RouterModule],
    templateUrl: './reports.component.html',
    styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
    timeframe: string = 'monthly';
    reportData: any = null;
    loading: boolean = false;
    dailyActivities: any[] = [];
    selectedDate: string = new Date().toISOString().split('T')[0];


    // Chart Properties
    public lineChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            line: {
                tension: 0.4
            }
        },
        scales: {
            y1: {
                position: 'left',
                grid: { display: false }
            },
            y2: {
                position: 'right',
                grid: { display: false }
            }
        }
    };
    public lineChartType: ChartType = 'line';
    public lineChartData: ChartData<'line'> = { labels: [], datasets: [] };

    public barChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false };
    public barChartType: ChartType = 'bar';
    public barChartData: ChartData<'bar'> = { labels: [], datasets: [] };

    public pieChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false };
    public pieChartType: ChartType = 'doughnut';
    public pieChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        this.fetchReport();
        this.fetchDailyActivities();
    }


    fetchReport(): void {
        this.loading = true;
        this.http.get<any>(`${environment.apiUrl}/reports/?timeframe=${this.timeframe}`).subscribe({
            next: (data) => {
                this.reportData = data;
                this.updateCharts(data.charts);
                this.loading = false;
            },
            error: (err) => {
                console.error('Error fetching reports:', err);
                this.loading = false;
            }
        });
    }

    fetchDailyActivities(): void {
        this.http.get<any[]>(`${environment.apiUrl}/reports/daily-activities/?date=${this.selectedDate}`).subscribe({
            next: (data) => {
                this.dailyActivities = data;
            },
            error: (err) => {
                console.error('Error fetching daily activities:', err);
            }
        });
    }

    onDateChange(event: any): void {
        this.selectedDate = event.target.value;
        this.fetchDailyActivities();
    }

    exportDailyActivities(): void {
        // Generate CSV content
        if (!this.dailyActivities || this.dailyActivities.length === 0) {
            alert('No data to export for this date');
            return;
        }

        const headers = ['Lead Name', 'From Stage', 'To Stage', 'Managed By', 'Time', 'Notes'];
        const rows = this.dailyActivities.map(activity => [
            activity.lead_name,
            activity.from_stage || 'N/A',
            activity.to_stage || 'N/A',
            activity.actor_name,
            new Date(activity.timestamp).toLocaleTimeString(),
            activity.notes || ''
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `daily_activities_${this.selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    onTimeframeChange(period: string): void {
        this.timeframe = period;
        this.fetchReport();
    }

    updateCharts(charts: any): void {
        // 1. Line Chart: Leads (y1) & Revenue (y2)
        this.lineChartData = {
            labels: charts.line.labels,
            datasets: [
                {
                    data: charts.line.leads,
                    label: 'New Leads',
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    yAxisID: 'y1'
                },
                {
                    data: charts.line.revenue,
                    label: 'Revenue (AED)',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    yAxisID: 'y2'
                }
            ]
        };

        // 2. Bar Chart: Team Performance
        this.barChartData = {
            labels: charts.bar.labels,
            datasets: [
                { data: charts.bar.leads, label: 'Assigned Leads', backgroundColor: '#6366f1' },
                { data: charts.bar.deals, label: 'Deals Won', backgroundColor: '#f59e0b' }
            ]
        };

        // 3. Pie Chart: Stage Distribution
        this.pieChartData = {
            labels: charts.doughnut.labels,
            datasets: [{
                data: charts.doughnut.data,
                backgroundColor: [
                    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6',
                    '#ef4444', '#14b8a6', '#84cc16'
                ]
            }]
        };
    }
}

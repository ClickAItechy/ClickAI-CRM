import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { LeadService } from '../../../core/services/lead.service';
import { Lead } from '../../../core/models/lead.model';
import { ToastService } from '../../../core/services/toast.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-reminder-list',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './reminder-list.component.html',
    styleUrls: ['./reminder-list.component.css']
})
export class ReminderListComponent implements OnInit {
    leads: Lead[] = [];
    todayRemindersCount: number = 0;
    loading = true;
    selectedDate: string = '';
    today = new Date();

    constructor(
        private leadService: LeadService,
        private http: HttpClient,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        const offset = this.today.getTimezoneOffset();
        const localDate = new Date(this.today.getTime() - (offset * 60 * 1000));
        this.selectedDate = localDate.toISOString().split('T')[0];

        this.loadData();
        this.loadDashboardStats();
    }

    loadDashboardStats(): void {
        this.http.get<any>(`${environment.apiUrl}/dashboard-stats/`).subscribe({
            next: (data) => {
                this.todayRemindersCount = data.today_reminders_count || 0;
            },
            error: (err) => console.error('Failed to load dashboard stats', err)
        });
    }

    loadData(): void {
        this.loading = true;
        const params: any = {};

        if (this.selectedDate) {
            params.reminder_date = this.selectedDate;
        }

        this.http.get<any>(`${environment.apiUrl}/leads/`, { params }).subscribe({
            next: (data) => {
                // Handle paginated response: { count, next, previous, results }
                this.leads = data.results || data;
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    onDateChange(): void {
        this.loadData();
    }

    async stopReminding(lead: Lead, event: Event): Promise<void> {
        event.stopPropagation();

        const result = await Swal.fire({
            title: 'Stop Reminding?',
            text: `Are you sure you want to stop reminding for ${lead.first_name} ${lead.last_name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, stop it!'
        });

        if (result.isConfirmed) {
            this.http.patch(`${environment.apiUrl}/leads/${lead.id}/update_reminder/`, { reminder_date: null }).subscribe({
                next: () => {
                    this.toastService.success(`Reminder stopped for ${lead.first_name} ${lead.last_name}`);
                    this.loadData();
                    this.loadDashboardStats();
                },
                error: (err) => this.toastService.error('Failed to stop reminder.')
            });
        }
    }

    async setNewReminder(lead: Lead, event: Event): Promise<void> {
        event.stopPropagation();

        // Extract just the YYYY-MM-DD from the current reminder date if it exists
        let currentDateString = this.selectedDate;
        if (lead.reminder_date) {
            currentDateString = lead.reminder_date.substring(0, 10);
        }

        const { value: newDateStr } = await Swal.fire({
            title: 'Update Reminder Date',
            html: `<input id="swal-reminder-date" type="date" class="swal2-input" value="${currentDateString}">`,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return (document.getElementById('swal-reminder-date') as HTMLInputElement).value;
            }
        });

        if (newDateStr) {
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (datePattern.test(newDateStr)) {
                this.http.patch(`${environment.apiUrl}/leads/${lead.id}/update_reminder/`, { reminder_date: newDateStr }).subscribe({
                    next: () => {
                        this.toastService.success(`Reminder updated to ${newDateStr}`);
                        this.loadData();
                        this.loadDashboardStats();
                    },
                    error: (err) => this.toastService.error('Failed to update reminder.')
                });
            } else {
                this.toastService.error('Invalid date format.');
            }
        }
    }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReminderService, Reminder, ReminderStats } from '../../../core/services/reminder.service';

@Component({
    selector: 'app-reminder-list',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './reminder-list.component.html',
    styleUrls: ['./reminder-list.component.css']
})
export class ReminderListComponent implements OnInit {
    reminders: Reminder[] = [];
    stats: ReminderStats | null = null;
    loading = true;
    filter: 'all' | 'today' | 'date' = 'all';
    selectedDate: string = '';
    today = new Date();

    constructor(private reminderService: ReminderService) { }

    ngOnInit(): void {
        this.selectedDate = this.today.toISOString().split('T')[0];
        this.loadData();
        this.reminderService.getReminderStats().subscribe(stats => this.stats = stats);
    }

    loadData(): void {
        this.loading = true;
        const params: any = {};
        params.status = 'PENDING'; // Always show only pending

        if (this.filter === 'today') {
            params.filter = 'today';
        } else if (this.filter === 'date' && this.selectedDate) {
            params.date = this.selectedDate;
        }

        this.reminderService.getReminders(params).subscribe({
            next: (data) => {
                this.reminders = data;
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    setFilter(f: 'all' | 'today' | 'date'): void {
        this.filter = f;
        this.loadData();
    }

    onDateChange(): void {
        this.filter = 'date';
        this.loadData();
    }

    markAsRead(reminder: Reminder): void {
        if (!reminder.is_read) {
            this.reminderService.markReminderAsRead(reminder.id).subscribe({
                next: () => {
                    reminder.is_read = true;
                    this.reminderService.refreshStats();
                }
            });
        }
    }

    stopReminding(reminder: Reminder, event: Event): void {
        event.stopPropagation();
        if (confirm('Are you sure you want to stop reminding for this lead?')) {
            this.reminderService.dismissReminder(reminder.id).subscribe({
                next: () => {
                    this.loadData();
                    this.reminderService.refreshStats();
                }
            });
        }
    }

    setNewReminder(reminder: Reminder, event: Event): void {
        event.stopPropagation();
        const newDateStr = prompt('Enter new reminder date (YYYY-MM-DD):', reminder.due_date.split('T')[0]);
        if (newDateStr) {
            const newDate = new Date(newDateStr);
            if (!isNaN(newDate.getTime())) {
                // Ideally there should be an update endpoint in ReminderService. 
                // If not, we can create a new reminder or use a custom endpoint.
                // Since user asked for "set new reminder", a custom endpoint or standard PUT might be needed.
                // To keep it simple, we will call an imaginary update endpoint or just re-create.
                // Wait, creating a new one:
                this.reminderService.dismissReminder(reminder.id).subscribe(() => {
                    this.reminderService.createReminder({
                        lead: reminder.lead,
                        assigned_to: reminder.assigned_to,
                        due_date: newDate.toISOString(),
                        message: reminder.message,
                        reminder_type: 'MANUAL',
                        status: 'PENDING'
                    }).subscribe(() => {
                        this.loadData();
                        this.reminderService.refreshStats();
                    });
                });
            } else {
                alert('Invalid date format.');
            }
        }
    }
}

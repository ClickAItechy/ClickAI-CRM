import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReminderService, Reminder, ReminderStats } from '../../../core/services/reminder.service';

@Component({
    selector: 'app-reminder-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './reminder-list.component.html',
    styleUrls: ['./reminder-list.component.css']
})
export class ReminderListComponent implements OnInit {
    reminders: Reminder[] = [];
    stats: ReminderStats | null = null;
    loading = true;
    filter: 'all' | 'today' = 'all';
    today = new Date();

    constructor(private reminderService: ReminderService) { }

    ngOnInit(): void {
        this.loadData();
        this.reminderService.getReminderStats().subscribe(stats => this.stats = stats);
    }

    loadData(): void {
        this.loading = true;
        const params: any = {};
        params.status = 'PENDING'; // Always show only pending
        if (this.filter !== 'all') params.filter = this.filter;

        this.reminderService.getReminders(params).subscribe({
            next: (data) => {
                this.reminders = data;
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    setFilter(f: 'all' | 'today'): void {
        this.filter = f;
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
}

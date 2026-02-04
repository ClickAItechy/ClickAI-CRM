import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReminderService, Reminder, ReminderStats } from '../../../core/services/reminder.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-reminder-widget',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './reminder-widget.component.html',
    styleUrls: ['./reminder-widget.component.css']
})
export class ReminderWidgetComponent implements OnInit {
    reminders: Reminder[] = [];
    stats: ReminderStats | null = null;
    loading = true;

    constructor(
        private reminderService: ReminderService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.loading = true;
        this.reminderService.getReminderStats().subscribe({
            next: (stats) => this.stats = stats
        });

        this.reminderService.getReminders({ status: 'PENDING', filter: 'today' }).subscribe({
            next: (reminders) => {
                this.reminders = reminders;
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    completeReminder(id: number, event: Event): void {
        event.stopPropagation();
        this.reminderService.completeReminder(id).subscribe({
            next: () => {
                this.toastService.success('Reminder completed');
                this.loadData();
            },
            error: () => this.toastService.error('Failed to complete reminder')
        });
    }

    getScoreClass(label: string): string {
        switch (label) {
            case 'HOT': return 'badge-danger';
            case 'WARM': return 'badge-warning';
            case 'COLD': return 'badge-info';
            default: return '';
        }
    }

    getScoreIcon(label: string): string {
        switch (label) {
            case 'HOT': return '🔥';
            case 'WARM': return '⚡';
            case 'COLD': return '❄️';
            default: return '❓';
        }
    }
}

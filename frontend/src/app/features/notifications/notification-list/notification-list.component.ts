import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService, Notification } from '../../../core/services/team.service';

@Component({
    selector: 'app-notification-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './notification-list.component.html',
    styleUrl: './notification-list.component.css'
})
export class NotificationListComponent implements OnInit {
    notifications: Notification[] = [];
    loading = true;

    constructor(private notificationService: NotificationService) { }

    ngOnInit(): void {
        this.loadNotifications();
    }

    loadNotifications(): void {
        this.loading = true;
        this.notificationService.getNotifications().subscribe({
            next: (data) => {
                this.notifications = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading notifications:', err);
                this.loading = false;
            }
        });
    }

    markAsRead(n: Notification): void {
        if (!n.is_read) {
            this.notificationService.markAsRead(n.id).subscribe({
                next: () => {
                    n.is_read = true;
                    this.notificationService.refreshUnreadCount();
                },
                error: (err) => console.error('Error marking as read:', err)
            });
        }
    }

    markAllAsRead(): void {
        this.notificationService.markAllAsRead().subscribe({
            next: () => {
                this.notifications.forEach(n => n.is_read = true);
            },
            error: (err) => console.error('Error marking all as read:', err)
        });
    }
}

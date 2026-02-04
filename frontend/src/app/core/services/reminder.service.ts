import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Reminder {
    id: number;
    lead: number;
    lead_name: string;
    assigned_to: number;
    assigned_to_name: string;
    reminder_type: 'AUTO' | 'MANUAL';
    status: 'PENDING' | 'COMPLETED' | 'DISMISSED';
    is_read: boolean;
    due_date: string;
    message: string;
    created_at: string;
    completed_at?: string;
}

export interface ReminderStats {
    total_pending: number;
    unread_count: number;
    overdue: number;
    today: number;
    upcoming: number;
    completed: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReminderService {
    private apiUrl = `${environment.apiUrl}/reminders/`;
    private unreadCountSubject = new BehaviorSubject<number>(0);
    unreadCount$ = this.unreadCountSubject.asObservable();

    constructor(private http: HttpClient) { }

    getReminders(params?: any): Observable<Reminder[]> {
        return this.http.get<Reminder[]>(this.apiUrl, { params });
    }

    createReminder(data: any): Observable<Reminder> {
        return this.http.post<Reminder>(this.apiUrl, data);
    }

    getReminderStats(): Observable<ReminderStats> {
        return this.http.get<ReminderStats>(`${this.apiUrl}stats/`).pipe(
            tap(stats => this.unreadCountSubject.next(stats.unread_count))
        );
    }

    markReminderAsRead(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}${id}/mark_read/`, {});
    }

    completeReminder(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}${id}/complete/`, {});
    }

    dismissReminder(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}${id}/dismiss/`, {});
    }

    refreshStats(): void {
        this.getReminderStats().subscribe();
    }
}


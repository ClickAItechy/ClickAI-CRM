import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Notification {
    id: number;
    message: string;
    is_read: boolean;
    created_at: string;
    task: number | null;
    task_subject: string | null;
    lead: number | null;
    lead_name: string | null;
    sender: number | null;
    sender_name: string | null;
}

export interface TeamMember {
    id: number;
    username: string;
    email: string;
    team: string;
    pending_task_count?: number;
}

export interface Team {
    value: string;
    label: string;
}

@Injectable({
    providedIn: 'root'
})
export class TeamService {
    private apiUrl = `${environment.apiUrl}`;

    constructor(private http: HttpClient) { }

    getTeams(): Observable<Team[]> {
        return this.http.get<Team[]>(`${this.apiUrl}/teams/`);
    }

    getTeamMembers(teamName: string): Observable<TeamMember[]> {
        return this.http.get<TeamMember[]>(`${this.apiUrl}/users/?team=${teamName}`);
    }

    getMemberTasks(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/tasks/?owner=${userId}`);
    }

    sendReminder(taskId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/tasks/${taskId}/send_reminder/`, {});
    }
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private apiUrl = `${environment.apiUrl}/notifications`;
    private unreadCountSubject = new BehaviorSubject<number>(0);
    unreadCount$ = this.unreadCountSubject.asObservable();

    constructor(private http: HttpClient) { }

    getNotifications(): Observable<Notification[]> {
        return this.http.get<Notification[]>(`${this.apiUrl}/`, {
            headers: { 'X-Skip-Loader': 'true' }
        });
    }

    getUnreadCount(): Observable<{ count: number }> {
        return this.http.get<{ count: number }>(`${this.apiUrl}/unread_count/`, {
            headers: { 'X-Skip-Loader': 'true' }
        }).pipe(
            tap(res => this.unreadCountSubject.next(res.count))
        );
    }

    markAsRead(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/mark_read/`, {});
    }

    markAllAsRead(): Observable<any> {
        return this.http.post(`${this.apiUrl}/mark_all_read/`, {}).pipe(
            tap(() => this.unreadCountSubject.next(0))
        );
    }

    refreshUnreadCount(): void {
        this.getUnreadCount().subscribe();
    }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Task {
    id?: number;
    subject: string;
    deadline: string;
    status: 'Not Started' | 'In Progress' | 'Completed' | 'Deferred';
    priority: 'Low' | 'Normal' | 'High' | 'Urgent';
    deal?: number;
    contact?: number;
    lead?: number;
    owner?: number;
    owner_name?: string;
    owner_team?: string;
    description: string;
    created_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TaskService {
    private apiUrl = `${environment.apiUrl}/tasks/`;

    constructor(private http: HttpClient) { }

    getTasks(params?: any): Observable<Task[]> {
        return this.http.get<Task[]>(this.apiUrl, { params });
    }

    getTaskById(id: number): Observable<Task> {
        return this.http.get<Task>(`${this.apiUrl}${id}/`);
    }

    createTask(taskData: any): Observable<Task> {
        return this.http.post<Task>(this.apiUrl, taskData);
    }

    updateTask(id: number, taskData: any): Observable<Task> {
        return this.http.patch<Task>(`${this.apiUrl}${id}/`, taskData);
    }

    sendReminder(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}${id}/send_reminder/`, {});
    }
}

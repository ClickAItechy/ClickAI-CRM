import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // User Management
    getUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/users/`);
    }

    updateUserRoles(userId: number, roleIds: number[]): Observable<any> {
        return this.http.patch(`${this.apiUrl}/users/${userId}/`, { role_ids: roleIds });
    }

    updateUser(userId: number, data: any): Observable<any> {
        return this.http.patch(`${this.apiUrl}/users/${userId}/`, data);
    }

    updateThreshold(userId: number, threshold: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/users/${userId}/update_threshold/`, { threshold });
    }

    onboardUser(userData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/users/onboard/`, userData);
    }

    // Role Management
    getRoles(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/rbac/roles/`);
    }

    createRole(role: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/rbac/roles/`, role);
    }

    updateRole(roleId: number, role: any): Observable<any> {
        return this.http.patch(`${this.apiUrl}/rbac/roles/${roleId}/`, role);
    }

    deleteRole(roleId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/rbac/roles/${roleId}/`);
    }

    // Permission Management
    getPermissions(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/rbac/permissions/`);
    }
}

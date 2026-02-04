import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private currentUserSubject: BehaviorSubject<any>;
    public currentUser: Observable<any>;

    constructor(private http: HttpClient, private router: Router) {
        const storedUser = localStorage.getItem('currentUser');
        this.currentUserSubject = new BehaviorSubject<any>(storedUser ? JSON.parse(storedUser) : null);
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue() {
        return this.currentUserSubject.value;
    }

    login(username: string, password: string): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/token/`, { username, password })
            .pipe(
                switchMap(tokens => {
                    const userData = { username, token: tokens.access, refreshToken: tokens.refresh };
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    this.currentUserSubject.next(userData);
                    // Fetch user details including roles
                    return this.http.get<any>(`${environment.apiUrl}/users/me/`).pipe(
                        map(details => {
                            const finalUser = { ...userData, ...details };
                            localStorage.setItem('currentUser', JSON.stringify(finalUser));
                            this.currentUserSubject.next(finalUser);
                            return finalUser;
                        })
                    );
                })
            );
    }

    logout(skipNavigation: boolean = false) {
        // remove user from local storage to log user out
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        if (!skipNavigation) {
            this.router.navigate(['/login']);
        }
    }

    refreshToken(): Observable<any> {
        const user = this.currentUserValue;
        if (!user || !user.refreshToken) {
            return throwError(() => new Error('No refresh token available'));
        }

        return this.http.post<any>(`${environment.apiUrl}/token/refresh/`, { refresh: user.refreshToken })
            .pipe(
                map(res => {
                    const updatedUser = { ...user, token: res.access };
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    this.currentUserSubject.next(updatedUser);
                    return updatedUser;
                })
            );
    }

    changePassword(data: any): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/users/change_password/`, data);
    }

    isLoggedIn(): boolean {
        return !!this.currentUserValue?.token;
    }
}

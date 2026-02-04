import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    username = '';
    password = '';
    error = '';
    loading = false;

    constructor(
        private authService: AuthService,
        private router: Router,
        private http: HttpClient
    ) { }

    ngOnInit() {
        // If there's a stored token, validate it with the backend first
        if (this.authService.isLoggedIn()) {
            this.loading = true;
            this.http.get(`${environment.apiUrl}/users/me/`).subscribe({
                next: () => {
                    // Token is valid, redirect to dashboard
                    this.router.navigate(['/dashboard']);
                },
                error: () => {
                    // Token is invalid or backend is unreachable, clear storage and stay on login
                    this.authService.logout(true);
                    this.loading = false;
                }
            });
        }
    }

    onSubmit() {
        this.loading = true;
        this.error = '';
        console.log('Attempting login for:', this.username);
        this.authService.login(this.username, this.password)
            .subscribe({
                next: (user) => {
                    console.log('Login successful:', user.username);
                    this.router.navigate(['/dashboard']);
                },
                error: (error) => {
                    console.error('Login error details:', error);
                    // Check if error status is 0 or undefined (often indicates network error or cors)
                    if (!error.status || error.status === 0) {
                        this.error = 'Unable to connect to the server. Please check your internet connection or if the backend is running.';
                    } else if (error.status === 401) {
                        this.error = 'Invalid username or password.';
                    } else if (error.status === 400) {
                        this.error = 'Invalid request. Please check your input.';
                    } else {
                        this.error = `Server Error (${error.status}): ${error.error?.detail || error.message || 'Unknown error'}`;
                    }
                    this.loading = false;
                }
            });
    }
}

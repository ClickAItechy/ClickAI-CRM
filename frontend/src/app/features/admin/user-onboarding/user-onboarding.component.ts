import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { TeamService } from '../../../core/services/team.service';

@Component({
    selector: 'app-user-onboarding',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './user-onboarding.component.html',
    styleUrls: ['./user-onboarding.component.css']
})
export class UserOnboardingComponent implements OnInit {
    onboardingForm: FormGroup;
    teams: any[] = [];
    loading = false;
    successMessage = '';
    errorMessage = '';

    constructor(
        private fb: FormBuilder,
        private adminService: AdminService,
        private teamService: TeamService,
        private router: Router
    ) {
        this.onboardingForm = this.fb.group({
            full_name: ['', [Validators.required, Validators.minLength(3)]],
            username: ['', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.required, Validators.email]],
            team: ['', Validators.required],
            is_manager: [false]
        });
    }

    ngOnInit(): void {
        this.loadTeams();
    }

    loadTeams() {
        this.teamService.getTeams().subscribe({
            next: (data) => {
                this.teams = data;
            },
            error: (err) => console.error('Error loading teams', err)
        });
    }

    onSubmit() {
        if (this.onboardingForm.invalid) {
            this.onboardingForm.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.successMessage = '';
        this.errorMessage = '';

        this.adminService.onboardUser(this.onboardingForm.value).subscribe({
            next: (res) => {
                this.loading = false;
                this.successMessage = `User ${this.onboardingForm.get('username')?.value} created successfully!`;
                this.onboardingForm.reset();
                // Clear message after 3 seconds
                setTimeout(() => this.successMessage = '', 3000);
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.error || 'Failed to create user. Please try again.';
            }
        });
    }
}

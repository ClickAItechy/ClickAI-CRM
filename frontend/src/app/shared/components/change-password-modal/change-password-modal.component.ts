import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-change-password-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './change-password-modal.component.html',
    styleUrls: ['./change-password-modal.component.css']
})
export class ChangePasswordModalComponent {
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();
    passwordForm: FormGroup;
    isLoading = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private toast: ToastService
    ) {
        this.passwordForm = this.fb.group({
            old_password: ['', Validators.required],
            new_password: ['', [Validators.required, Validators.minLength(8)]],
            confirm_password: ['', Validators.required]
        }, { validator: this.checkPasswords });
    }

    checkPasswords(group: FormGroup) {
        const pass = group.get('new_password')?.value;
        const confirmPass = group.get('confirm_password')?.value;
        return pass === confirmPass ? null : { notSame: true };
    }

    onSubmit() {
        if (this.passwordForm.invalid) return;

        this.isLoading = true;
        this.authService.changePassword(this.passwordForm.value).subscribe({
            next: () => {
                this.isLoading = false;
                this.toast.success('Password changed successfully. Please login again.');
                this.close.emit();
                this.authService.logout();
            },
            error: (err) => {
                this.isLoading = false;
                this.toast.error(err.error?.error || 'Failed to change password');
            }
        });
    }

    onClose() {
        this.close.emit();
        this.passwordForm.reset();
    }
}

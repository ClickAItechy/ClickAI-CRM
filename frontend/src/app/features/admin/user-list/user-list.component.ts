import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormsModule } from '@angular/forms';

interface User {
    id: number;
    username: string;
    email: string;
    team: string;
    is_manager: boolean;
    view_all_leads: boolean;
}

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-list.component.html',
    styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
    users: User[] = [];
    loading = true;

    constructor(
        private adminService: AdminService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.loading = true;
        this.adminService.getUsers().subscribe({
            next: (data: any) => {
                this.users = data;
                this.loading = false;
            },
            error: (err: any) => {
                this.toastService.error('Failed to load users');
                this.loading = false;
            }
        });
    }

    toggleManager(user: User) {
        this.updateUser(user.id, { is_manager: user.is_manager });
    }

    toggleViewAll(user: User) {
        this.updateUser(user.id, { view_all_leads: user.view_all_leads });
    }

    updateUser(id: number, data: any) {
        this.adminService.updateUser(id, data).subscribe({
            next: () => this.toastService.success('User updated successfully'),
            error: () => this.toastService.error('Failed to update user')
        });
    }
}

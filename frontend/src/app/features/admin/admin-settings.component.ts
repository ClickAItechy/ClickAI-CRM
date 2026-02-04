import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-admin-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-settings.component.html',
    styleUrl: './admin-settings.component.css'
})
export class AdminSettingsComponent implements OnInit {
    activeTab: 'users' | 'roles' | 'thresholds' = 'users';

    users: any[] = [];
    roles: any[] = [];
    permissions: any[] = [];

    selectedUser: any = null;
    selectedRole: any = null;

    isUserModalOpen = false;
    isRoleModalOpen = false;

    constructor(
        private adminService: AdminService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.reloadData();
    }

    reloadData() {
        this.adminService.getUsers().subscribe(data => this.users = data);
        this.adminService.getRoles().subscribe(data => this.roles = data);
        this.adminService.getPermissions().subscribe(data => this.permissions = data);
    }

    // User Actions
    openUserRoleModal(user: any) {
        this.selectedUser = { ...user };

        // Reset and sync roles check status
        this.roles.forEach(role => {
            role.selected = this.isRoleAssigned(user, role.name);
        });

        this.isUserModalOpen = true;
    }

    saveUserRoles() {
        const roleIds = this.roles.filter(r => r.selected).map(r => r.id);
        this.adminService.updateUserRoles(this.selectedUser.id, roleIds).subscribe(() => {
            this.isUserModalOpen = false;
            this.reloadData();
        });
    }

    // Role Actions
    openRoleModal(role: any = null) {
        if (role) {
            this.selectedRole = { ...role };
            // Pre-select permissions
            const rolePermIds = role.permissions.map((p: any) => p.id);
            this.permissions.forEach(p => p.selected = rolePermIds.includes(p.id));
        } else {
            this.selectedRole = { name: '', description: '' };
            this.permissions.forEach(p => p.selected = false);
        }
        this.isRoleModalOpen = true;
    }

    saveRole() {
        const permissionIds = this.permissions.filter(p => p.selected).map(p => p.id);
        const roleData = { ...this.selectedRole, permission_ids: permissionIds };

        if (this.selectedRole.id) {
            this.adminService.updateRole(this.selectedRole.id, roleData).subscribe(() => {
                this.isRoleModalOpen = false;
                this.reloadData();
            });
        } else {
            this.adminService.createRole(roleData).subscribe(() => {
                this.isRoleModalOpen = false;
                this.reloadData();
            });
        }
    }

    togglePermission(perm: any) {
        perm.selected = !perm.selected;
    }

    isRoleAssigned(user: any, roleName: string): boolean {
        return user.roles && user.roles.includes(roleName);
    }

    toggleUserRole(user: any, role: any) {
        // Immediate update for better UX, or wait for save? 
        // Let's go with a Modal pattern as planned.
    }

    async editThreshold(user: any) {
        const { value: threshold } = await Swal.fire({
            title: `Edit Threshold for ${user.username}`,
            input: 'number',
            inputValue: user.revenue_threshold || 0,
            inputLabel: 'Monthly Revenue Target ($)',
            showCancelButton: true,
            confirmButtonText: 'Update',
            inputValidator: (value) => {
                if (!value || isNaN(Number(value)) || Number(value) < 0) {
                    return 'Please enter a valid positive number';
                }
                return null;
            }
        });

        if (threshold) {
            const newThreshold = parseFloat(threshold);
            this.adminService.updateThreshold(user.id, newThreshold).subscribe({
                next: (res) => {
                    user.revenue_threshold = newThreshold;
                    this.toastService.success(`Threshold updated for ${user.username}`);
                },
                error: (err) => {
                    console.error('Failed to update threshold', err);
                    this.toastService.error('Failed to update threshold');
                }
            });
        }
    }
}

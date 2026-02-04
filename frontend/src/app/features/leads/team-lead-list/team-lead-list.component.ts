import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LeadService } from '../../../core/services/lead.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-team-lead-list',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './team-lead-list.component.html',
    styles: [`
    .priority-dot {
      height: 10px; width: 10px; border-radius: 50%; display: inline-block; margin-right: 5px;
    }
    .table-container {
        overflow-x: auto;
    }
    .selected-row {
        background-color: #f0f9ff;
    }
  `]
})
export class TeamLeadListComponent implements OnInit {
    leads: any[] = [];
    users: any[] = [];
    teamName: string = '';
    showUnassigned: boolean = false;
    loading = true;

    // Search & Filter
    searchTerm: string = '';
    searchSubject = new Subject<string>();

    // Bulk Selection
    selectedLeadIds: Set<number> = new Set();
    isAllSelected: boolean = false;
    selectedUserId: number | null = null;

    isAdmin = false;

    constructor(
        private route: ActivatedRoute,
        private http: HttpClient,
        private leadService: LeadService,
        private authService: AuthService,
        private toastService: ToastService
    ) {
        this.isAdmin = this.authService.currentUserValue?.is_superuser || this.authService.currentUserValue?.is_manager;
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(term => {
            this.searchTerm = term;
            this.fetchLeads();
        });
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.teamName = params['team'];
            this.showUnassigned = params['unassigned'] === 'true';
            this.fetchLeads();
        });
        this.loadUsers();
    }

    loadUsers() {
        this.leadService.getUsers().subscribe(users => {
            this.users = users;
        });
    }

    onSearch(term: string) {
        this.searchSubject.next(term);
    }

    // Filters
    filterType: 'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'NEW_TODAY' = 'ALL';

    fetchLeads() {
        this.loading = true;
        let url = `${environment.apiUrl}/leads/`;
        const params: any = {};

        if (this.teamName) params.team = this.teamName;
        if (this.searchTerm) params.search = this.searchTerm;

        // Granular Filter Logic
        switch (this.filterType) {
            case 'UNASSIGNED':
                params.unassigned = 'true';
                break;
            case 'ASSIGNED':
                params.assigned = 'true';
                break;
            case 'NEW_TODAY':
                params.new_today = 'true';
                break;
        }

        // Query param override (from Dashboard)
        if (this.showUnassigned) {
            this.filterType = 'UNASSIGNED';
            params.unassigned = 'true';
        }

        this.http.get<any[]>(url, { params }).subscribe({
            next: (data) => {
                this.leads = data;
                this.loading = false;
                this.selectedLeadIds.clear();
                this.isAllSelected = false;
            },
            error: (err) => {
                console.error('Error fetching leads:', err);
                this.loading = false;
            }
        });
    }

    setFilter(type: 'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'NEW_TODAY') {
        this.filterType = type;
        this.showUnassigned = false; // Reset query param override
        this.fetchLeads();
    }

    exportCsv() {
        const url = `${environment.apiUrl}/leads/export_csv/`;
        const params: any = {};
        if (this.teamName) params.team = this.teamName;
        if (this.searchTerm) params.search = this.searchTerm;

        this.http.get(url, { params, responseType: 'blob' }).subscribe(blob => {
            const a = document.createElement('a');
            const objectUrl = URL.createObjectURL(blob);
            a.href = objectUrl;
            a.download = 'leads.csv';
            a.click();
            URL.revokeObjectURL(objectUrl);
        });
    }

    // Bulk Selection Logic
    toggleSelectAll(event: any) {
        this.isAllSelected = event.target.checked;
        if (this.isAllSelected) {
            this.leads.forEach(l => this.selectedLeadIds.add(l.id));
        } else {
            this.selectedLeadIds.clear();
        }
    }

    toggleSelection(leadId: number) {
        if (this.selectedLeadIds.has(leadId)) {
            this.selectedLeadIds.delete(leadId);
        } else {
            this.selectedLeadIds.add(leadId);
        }
        this.isAllSelected = this.leads.length > 0 && this.selectedLeadIds.size === this.leads.length;
    }

    isSelected(leadId: number): boolean {
        return this.selectedLeadIds.has(leadId);
    }

    assignSelectedLeads() {
        if (!this.selectedUserId || this.selectedLeadIds.size === 0) return;

        Swal.fire({
            title: 'Bulk Assignment',
            text: `Assign ${this.selectedLeadIds.size} leads to the selected user?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Assign',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                const ids = Array.from(this.selectedLeadIds);
                this.leadService.bulkAssign(ids, this.selectedUserId!).subscribe({
                    next: () => {
                        this.toastService.success('Assignment successful');
                        this.fetchLeads();
                        this.selectedUserId = null;
                        this.selectedLeadIds.clear();
                        this.isAllSelected = false;
                    },
                    error: (err) => this.toastService.error('Failed to assign: ' + err.message)
                });
            }
        });
    }

    getStageColor(stage: string): string {
        const colors: { [key: string]: string } = {
            'NEW_INQUIRY': 'badge-info',
            'QUALIFICATION': 'badge-info',
            'DISCOVERY': 'badge-info',
            'PROPOSAL': 'badge-warning',
            'NEGOTIATION': 'badge-warning',
            'WON': 'badge-success',
            'PROJECT_EXECUTION': 'badge-success',
            'DELIVERED': 'badge-success',
            'LOST': 'badge-danger',
            'ON_HOLD': 'badge-warning'
        };
        return colors[stage] || 'badge-info';
    }

    getScoreClass(label: string): string {
        switch (label) {
            case 'HOT': return 'badge-danger';
            case 'WARM': return 'badge-warning';
            case 'COLD': return 'badge-info';
            default: return '';
        }
    }

    getScoreIcon(label: string): string {
        switch (label) {
            case 'HOT': return '🔥';
            case 'WARM': return '⚡';
            case 'COLD': return '❄️';
            default: return '❓';
        }
    }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LeadService } from '../../../core/services/lead.service';
import { Team, LeadStage } from '../../../core/models/lead.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-create-lead',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './create-lead.component.html',
    styles: [`
    .container { max-width: 600px; margin: 20px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .btn { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .btn:disabled { background: #ccc; }
  `]
})
export class CreateLeadComponent implements OnInit {
    lead: any = {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        tech_requirements: '',
        stage: LeadStage.NEW_INQUIRY,
        assigned_team: Team.ADMIN,
        lead_generator: null
    };

    loading = false;
    users: any[] = [];

    constructor(
        private leadService: LeadService,
        private router: Router,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.leadService.getUsers().subscribe(users => {
            this.users = users;
        });
    }

    onSubmit() {
        this.loading = true;
        this.leadService.createLead(this.lead).subscribe({
            next: (newLead) => {
                this.toastService.success('Lead Created! ID: ' + newLead.id);
                this.router.navigate(['/dashboard/leads']);
            },
            error: (err) => {
                console.error(err);
                this.toastService.error('Error creating lead.');
                this.loading = false;
            }
        });
    }
}

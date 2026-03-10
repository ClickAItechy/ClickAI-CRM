import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LeadService } from '../../../core/services/lead.service';
import { Lead, LeadStage, LeadStatus, LeadDocument, TechPipelineStage } from '../../../core/models/lead.model';
import { TaskService, Task } from '../../../core/services/task.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import Swal from 'sweetalert2';

import { EmailComposeModalComponent } from '../email-compose-modal/email-compose-modal.component';
import { DocumentUploadModalComponent } from '../document-upload-modal/document-upload-modal.component';
import { TechPipelineComponent } from '../tech-pipeline/tech-pipeline.component';
import { TechPipelineService } from '../../../core/services/tech-pipeline.service';
import { AuthService } from '../../../core/services/auth.service';
import { TechPipeline } from '../../../core/models/lead.model';

@Component({
    selector: 'app-lead-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, EmailComposeModalComponent, DocumentUploadModalComponent, TechPipelineComponent],
    templateUrl: './lead-detail.component.html',
    styleUrls: ['./lead-detail.component.css']
})
export class LeadDetailComponent implements OnInit {
    lead: Lead | null = null;
    phases = [
        { id: 'NEW_INQUIRY', name: 'New Inquiry', stages: [LeadStage.NEW_INQUIRY] },
        { id: 'QUALIFICATION', name: 'Qualification', stages: [LeadStage.QUALIFICATION] },
        { id: 'DISCOVERY', name: 'Discovery', stages: [LeadStage.DISCOVERY] },
        { id: 'PROPOSAL', name: 'Proposal', stages: [LeadStage.PROPOSAL] },
        { id: 'NEGOTIATION', name: 'Negotiation', stages: [LeadStage.NEGOTIATION] },
        { id: 'WON', name: 'Won', stages: [LeadStage.WON] },
        { id: 'PROJECT_EXECUTION', name: 'Project Execution', stages: [LeadStage.PROJECT_EXECUTION] },
        { id: 'DELIVERED', name: 'Delivered', stages: [LeadStage.DELIVERED] },
        { id: 'LOST', name: 'Lost', stages: [LeadStage.LOST] },
        { id: 'ON_HOLD', name: 'On Hold', stages: [LeadStage.ON_HOLD] }
    ];
    stages = Object.values(LeadStage);
    activeTab = 'notes';
    newNote = '';
    emirateOptions = [
        'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'
    ];

    // Documents & Transition
    selectedStage: string = '';
    showMoveStage: boolean = false;
    expandedSection: string = 'attachments'; // Default expanded

    // Modals
    showEmailModal: boolean = false;
    showDocumentModal: boolean = false;

    toggleSection(section: string) {
        if (this.expandedSection === section) {
            this.expandedSection = '';
        } else {
            this.expandedSection = section;
        }
    }

    constructor(
        private route: ActivatedRoute,
        private leadService: LeadService,
        private taskService: TaskService,
        private toastService: ToastService,
        private techPipelineService: TechPipelineService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadLead(+id);
        }
        this.checkAdminStatus();
        this.loadUsers();
    }

    users: any[] = [];
    loadUsers() {
        this.leadService.getUsers().subscribe(users => {
            this.users = users;
        });
    }

    isAdmin = false;
    checkAdminStatus() {
        const user = this.authService.currentUserValue;
        this.isAdmin = user?.is_manager || user?.is_superuser; // Adjust based on your Auth model
    }



    get currentPhaseIndex(): number {
        if (!this.lead) return -1;
        return this.phases.findIndex(p => p.stages.includes(this.lead!.stage));
    }

    get currentStageIndex(): number {
        if (!this.lead) return -1;
        return this.stages.indexOf(this.lead.stage);
    }

    getStageLabel(stage: string): string {
        return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    // Lead Generator Editing
    async editLeadGenerator() {
        if (!this.isAdmin || !this.lead) return;

        let optionsHtml = '<option value="">Select Team Member...</option>';
        this.users.forEach(u => {
            const selected = this.lead?.lead_generator === u.id ? 'selected' : '';
            optionsHtml += `<option value="${u.id}" ${selected}>${u.username} (${u.team})</option>`;
        });

        const { value: userId } = await Swal.fire({
            title: 'Update Lead Generator',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Assign Lead Generator</label>
                    <select id="swal-lead-gen" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s; background: white;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        ${optionsHtml}
                    </select>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return (document.getElementById('swal-lead-gen') as HTMLSelectElement).value;
            }
        });

        if (userId !== undefined && userId !== false) {
            // userId is string from select. If empty string, means null.
            const id = userId === '' ? null : +userId;
            this.updateLeadGenerator(id);
        }
    }

    updateLeadGenerator(userId: number | null) {
        if (!this.lead) return;
        // Cast to any because generic Partial<Lead> might complain about null if not strictly defined
        const updateData: any = { lead_generator: userId };

        this.leadService.updateLead(this.lead.id, updateData).subscribe({
            next: (updatedLead) => {
                this.lead = updatedLead;
                this.toastService.success('Lead Generator updated');
            },
            error: () => this.toastService.error('Failed to update lead generator')
        });
    }

    // Reminder Date Editing
    async editReminderDate() {
        if (!this.isAdmin || !this.lead) return;

        const { value: reminderDateStr } = await Swal.fire({
            title: 'Update Reminder Date',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Follow-up Date</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">📅</span>
                            <input id="swal-reminder-date" type="date" value="${this.lead.reminder_date?.split('T')[0] || ''}" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        </div>
                    </div>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return (document.getElementById('swal-reminder-date') as HTMLInputElement).value;
            }
        });

        if (reminderDateStr !== undefined) {
            this.updateReminderDate(reminderDateStr ? reminderDateStr : null);
        }
    }

    updateReminderDate(dateStr: string | null) {
        if (!this.lead) return;

        const updateData: any = { reminder_date: dateStr };
        this.leadService.updateLead(this.lead.id, updateData).subscribe({
            next: (updatedLead) => {
                this.lead = updatedLead;
                this.toastService.success('Reminder Date updated');
            },
            error: () => this.toastService.error('Failed to update reminder date')
        });
    }

    // Latest Update Editing
    async editLatestUpdate() {
        if (!this.isAdmin || !this.lead) return;

        const { value: updateDateStr } = await Swal.fire({
            title: 'Update Latest Visit/Update',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Latest Update Date</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">🗓️</span>
                            <input id="swal-latest-update" type="date" value="${this.lead.latest_update?.split('T')[0] || ''}" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        </div>
                    </div>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return (document.getElementById('swal-latest-update') as HTMLInputElement).value;
            }
        });

        if (updateDateStr !== undefined) {
            this.updateLatestUpdate(updateDateStr ? updateDateStr : null);
        }
    }

    updateLatestUpdate(dateStr: string | null) {
        if (!this.lead) return;

        const updateData: any = { latest_update: dateStr };
        this.leadService.updateLead(this.lead.id, updateData).subscribe({
            next: (updatedLead) => {
                this.lead = updatedLead;
                this.toastService.success('Latest Update saved');
            },
            error: () => this.toastService.error('Failed to save latest update')
        });
    }

    // Name Editing
    async editName() {
        if (!this.lead) return;
        const { value: name } = await Swal.fire({
            title: 'Edit Name',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Full Name</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">👤</span>
                            <input id="swal-name" type="text" value="${this.lead.first_name + ' ' + this.lead.last_name}" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        </div>
                    </div>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                const val = (document.getElementById('swal-name') as HTMLInputElement).value;
                if (!val) {
                    Swal.showValidationMessage('Name is required!');
                    return false;
                }
                return val;
            }
        });

        if (name) {
            const parts = name.trim().split(/\s+/);
            const first_name = parts[0] || '';
            const last_name = parts.slice(1).join(' ') || '';
            this.updateLead({ first_name, last_name });
        }
    }

    // Contact Info Editing (Email, Phone, Address)
    async editContactInfo() {
        if (!this.lead) return;
        const { value: contactData } = await Swal.fire({
            title: 'Update Contact Info',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Email Address</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">📧</span>
                            <input id="swal-email" type="email" value="${this.lead.email || ''}" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        </div>
                    </div>
                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Phone Number</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">📞</span>
                            <input id="swal-phone" type="tel" value="${this.lead.phone || ''}" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        </div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Full Address</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">📍</span>
                            <textarea id="swal-address" rows="3" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s; resize: vertical;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">${this.lead.address || ''}</textarea>
                        </div>
                    </div>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return {
                    email: (document.getElementById('swal-email') as HTMLInputElement).value,
                    phone: (document.getElementById('swal-phone') as HTMLInputElement).value,
                    address: (document.getElementById('swal-address') as HTMLTextAreaElement).value
                }
            }
        });

        if (contactData) {
            this.updateLead({
                email: contactData.email || null,
                phone: contactData.phone || null,
                address: contactData.address || null
            });
        }
    }

    // Industry Editing
    async editIndustry() {
        if (!this.lead) return;
        const { value: industry } = await Swal.fire({
            title: 'Update Industry',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Industry & Sector</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">🏢</span>
                            <input id="swal-industry" type="text" value="${this.lead.industry || ''}" placeholder="e.g. Technology, Healthcare, Real Estate..." style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        </div>
                    </div>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return (document.getElementById('swal-industry') as HTMLInputElement).value;
            }
        });

        if (industry !== undefined) {
            this.updateLead({ industry });
        }
    }

    // Emirate Editing
    async editEmirate() {
        if (!this.lead) return;
        let optionsHtml = '<option value="">Select Emirate...</option>';
        this.emirateOptions.forEach(opt => {
            const selected = this.lead?.emirate === opt ? 'selected' : '';
            optionsHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
        });

        const { value: emirate } = await Swal.fire({
            title: 'Update Emirate',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Select Emirate</label>
                    <select id="swal-emirate" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s; background: white;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        ${optionsHtml}
                    </select>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return (document.getElementById('swal-emirate') as HTMLSelectElement).value;
            }
        });

        if (emirate !== undefined && emirate !== false) {
            this.updateLead({ emirate: emirate || null });
        }
    }

    // Status Editing
    async editStatus() {
        if (!this.isAdmin || !this.lead) return;
        let optionsHtml = '';
        const statuses = [
            { id: LeadStatus.INTERESTED, label: 'Interested' },
            { id: LeadStatus.NEEDS_FOLLOW_UP, label: 'Needs Follow-up' },
            { id: LeadStatus.NOT_INTERESTED, label: 'Not Interested' }
        ];
        statuses.forEach(s => {
            const selected = this.lead?.status === s.id ? 'selected' : '';
            optionsHtml += `<option value="${s.id}" ${selected}>${s.label}</option>`;
        });

        const { value: status } = await Swal.fire({
            title: 'Update Lead Status',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Select Status</label>
                    <select id="swal-status" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s; background: white;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        ${optionsHtml}
                    </select>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return (document.getElementById('swal-status') as HTMLSelectElement).value;
            }
        });

        if (status !== undefined && status !== false) {
            this.updateLead({ status: status as LeadStatus });
        }
    }

    // Tech Requirements Editing
    async editTechRequirements() {
        if (!this.isAdmin || !this.lead) return;
        const { value: tech_requirements } = await Swal.fire({
            title: 'Update Tech Requirements',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Technical Requirements</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">💻</span>
                            <textarea id="swal-tech-reqs" rows="4" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s; resize: vertical;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">${this.lead.tech_requirements || ''}</textarea>
                        </div>
                    </div>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return (document.getElementById('swal-tech-reqs') as HTMLTextAreaElement).value;
            }
        });

        if (tech_requirements !== undefined) {
            this.updateLead({ tech_requirements });
        }
    }

    // Remarks Editing
    async editRemarks() {
        if (!this.isAdmin || !this.lead) return;
        const { value: remarks } = await Swal.fire({
            title: 'Update Remarks',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Remarks & Notes</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">📝</span>
                            <textarea id="swal-remarks" rows="4" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s; resize: vertical;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">${this.lead.remarks || ''}</textarea>
                        </div>
                    </div>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return (document.getElementById('swal-remarks') as HTMLTextAreaElement).value;
            }
        });

        if (remarks !== undefined) {
            this.updateLead({ remarks });
        }
    }

    updateLead(data: Partial<Lead>) {
        if (!this.lead) return;
        this.leadService.updateLead(this.lead.id, data).subscribe({
            next: (updatedLead) => {
                this.lead = updatedLead;
                this.toastService.success('Lead updated');
            },
            error: () => this.toastService.error('Failed to update lead')
        });
    }

    // Financial Editing
    async editFinancials() {
        if (!this.isAdmin || !this.lead) return;

        const { value: formValues } = await Swal.fire({
            title: 'Update Financials',
            html:
                `
                <div style="padding: 0.5rem 0; text-align: left;">
                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Project Amount (AED)</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">💰</span>
                            <input id="swal-project-amount" type="number" value="${this.lead.project_amount || 0}" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        </div>
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Advance Amount (AED)</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 12px; font-size: 1.1rem; opacity: 0.6;">💵</span>
                            <input id="swal-advance-amount" type="number" value="${this.lead.advance_amount || 0}" style="width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; color: #0f172a; outline: none; transition: all 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 3px rgba(99, 102, 241, 0.15)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                        </div>
                    </div>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return {
                    project_amount: (document.getElementById('swal-project-amount') as HTMLInputElement).value,
                    advance_amount: (document.getElementById('swal-advance-amount') as HTMLInputElement).value
                }
            }
        });

        if (formValues) {
            this.updateFinancials(+formValues.project_amount, +formValues.advance_amount);
        }
    }

    updateFinancials(projectAmount: number, advanceAmount: number) {
        if (!this.lead) return;
        this.leadService.updateLead(this.lead.id, {
            project_amount: projectAmount,
            advance_amount: advanceAmount
        }).subscribe({
            next: (updatedLead) => {
                this.lead = updatedLead;
                this.toastService.success('Financials updated');
            },
            error: () => this.toastService.error('Failed to update financials')
        });
    }

    loadLead(id: number) {
        this.leadService.getLeadById(id).subscribe(data => {
            this.lead = data;
            this.loadTasks();
            this.loadNotes();
            this.loadTechPipeline();
        });
    }

    // Tech Pipeline
    techPipeline: TechPipeline | null = null;

    loadTechPipeline() {
        if (!this.lead?.tech_pipeline_id) return;
        this.techPipelineService.getPipeline(this.lead.tech_pipeline_id).subscribe({
            next: (pipeline) => this.techPipeline = pipeline,
            error: () => this.techPipeline = null
        });
    }

    // Tasks
    tasks: Task[] = [];
    newTaskSubject: string = '';
    newTaskDeadline: string = '';

    loadTasks() {
        if (!this.lead) return;
        this.taskService.getTasks({ lead: this.lead.id }).subscribe(tasks => {
            this.tasks = tasks;
        });
    }



    createTask() {
        if (!this.newTaskSubject) return;

        const taskData = {
            subject: this.newTaskSubject,
            deadline: this.newTaskDeadline,
            status: 'Not Started',
            priority: 'Normal',
            description: `Task for Lead: ${this.lead?.first_name} ${this.lead?.last_name}`,
            lead: this.lead?.id
        };

        this.taskService.createTask(taskData).subscribe({
            next: (task) => {
                this.tasks.unshift(task);
                this.newTaskSubject = '';
                this.newTaskDeadline = '';
                this.toastService.success('Task created');
            },
            error: () => this.toastService.error('Failed to create task')
        });
    }




    toggleTaskStatus(task: Task) {
        if (!task.id) return;
        const newStatus = task.status === 'Completed' ? 'Not Started' : 'Completed';
        this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
            next: (updatedTask) => {
                task.status = updatedTask.status;
                this.toastService.success(`Task marked as ${updatedTask.status}`);
            },
            error: () => this.toastService.error('Failed to update task status')
        });
    }

    changePhaseWithConfirm(phaseId: string) {
        const phase = this.phases.find(p => p.id === phaseId);
        if (phase && phase.stages.length > 0) {
            this.selectedStage = phase.stages[0];
            this.changeStage();
        }
    }

    changeStageWithConfirm(stage: string) {
        this.selectedStage = stage;
        this.changeStage();
    }

    changeStage() {
        if (!this.lead || !this.selectedStage) return;

        Swal.fire({
            title: 'Change Stage',
            text: `Are you sure you want to move this lead to "${this.selectedStage}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Move',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed && this.lead) {
                this.leadService.transitionLead(this.lead.id, this.selectedStage, this.newNote).subscribe({
                    next: () => {
                        this.newNote = '';
                        this.toastService.success(`Lead moved to ${this.selectedStage}`);
                        this.loadLead(this.lead!.id); // Reload to get fresh audit_logs
                    },
                    error: (err) => this.toastService.error('Failed to change stage')
                });
            }
        });
    }

    // Notes Logic
    notes: any[] = [];
    noteContent: string = '';

    loadNotes() {
        if (this.lead) {
            this.leadService.getNotes(this.lead.id).subscribe(data => {
                this.notes = data;
            });
        }
    }

    saveNote() {
        if (!this.lead || !this.noteContent.trim()) return;

        const noteData = {
            lead: this.lead.id,
            content: this.noteContent
        };

        this.leadService.createNote(noteData).subscribe({
            next: () => {
                this.noteContent = '';
                this.toastService.success('Note added');
                this.loadNotes();
                this.loadLead(this.lead!.id); // Reload to get fresh audit_logs
            },
            error: () => {
                this.toastService.error('Failed to add note');
            }
        });
    }

    // Email Logic
    openEmailModal() {
        this.showEmailModal = true;
    }

    sendEmail(emailData: any) {
        if (!this.lead) return;

        this.leadService.sendEmail(this.lead.id, emailData).subscribe({
            next: () => {
                this.toastService.success('Email sent successfully!');
                this.showEmailModal = false;
            },
            error: () => this.toastService.error('Failed to send email.')
        });
    }

    // Document Logic
    openDocumentModal() {
        this.showDocumentModal = true;
    }

    onDocumentUpdate() {
        if (this.lead) {
            this.loadLead(this.lead.id); // Refresh lead to get updated documents
        }
    }

    // Avatar Helpers
    getInitials(name: string = ''): string {
        if (!name) return '';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    }

    getAvatarColor(name: string = ''): string {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

}

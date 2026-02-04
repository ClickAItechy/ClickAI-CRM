import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LeadService } from '../../../core/services/lead.service';
import { Lead, LeadStage, LeadDocument, TechPipelineStage } from '../../../core/models/lead.model';
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
    activeTab = 'history'; // 'history', 'docs'
    newNote = '';

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
            title: 'Edit Lead Generator',
            html: `<select id="swal-lead-gen" class="swal2-input">${optionsHtml}</select>`,
            focusConfirm: false,
            showCancelButton: true,
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

    // Financial Editing
    async editFinancials() {
        if (!this.isAdmin || !this.lead) return;

        const { value: formValues } = await Swal.fire({
            title: 'Edit Financials',
            html:
                `
                <div style="text-align:left; margin-bottom:10px;">
                    <label>Project Amount</label>
                    <input id="swal-project-amount" type="number" class="swal2-input" value="${this.lead.project_amount || 0}">
                </div>
                <div style="text-align:left;">
                    <label>Advance Amount</label>
                    <input id="swal-advance-amount" type="number" class="swal2-input" value="${this.lead.advance_amount || 0}">
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
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
                    next: (updatedLead) => {
                        this.lead = updatedLead;
                        this.newNote = '';
                        this.toastService.success(`Lead moved to ${this.selectedStage}`);
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

        this.leadService.createNote(noteData).subscribe(newNote => {
            this.notes.unshift(newNote); // Add to top
            this.noteContent = '';
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
    getInitials(firstName: string = '', lastName: string = ''): string {
        return (firstName.charAt(0) || '') + (lastName.charAt(0) || '');
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

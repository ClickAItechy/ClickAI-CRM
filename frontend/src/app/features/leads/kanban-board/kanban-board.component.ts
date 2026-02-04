import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Lead, LeadStage } from '../../../core/models/lead.model';
import { LeadService } from '../../../core/services/lead.service';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-kanban-board',
    standalone: true,
    imports: [CommonModule, DragDropModule],
    templateUrl: './kanban-board.component.html',
    styleUrls: ['./kanban-board.component.css']
})
export class KanbanBoardComponent implements OnInit {
    // Define the phases and their mapping - flat list with all stages visible
    phases = [
        {
            id: 'NEW_INQUIRY',
            name: 'New Inquiry',
            stages: ['NEW_INQUIRY']
        },
        {
            id: 'QUALIFICATION',
            name: 'Qualification',
            stages: ['QUALIFICATION']
        },
        {
            id: 'DISCOVERY',
            name: 'Discovery',
            stages: ['DISCOVERY']
        },
        {
            id: 'PROPOSAL',
            name: 'Proposal',
            stages: ['PROPOSAL']
        },
        {
            id: 'NEGOTIATION',
            name: 'Negotiation',
            stages: ['NEGOTIATION']
        },
        {
            id: 'WON',
            name: 'Won',
            stages: ['WON']
        },
        {
            id: 'PROJECT_EXECUTION',
            name: 'Project Execution',
            stages: ['PROJECT_EXECUTION']
        },
        {
            id: 'DELIVERED',
            name: 'Delivered',
            stages: ['DELIVERED']
        },
        {
            id: 'LOST',
            name: 'Lost',
            stages: ['LOST']
        },
        {
            id: 'ON_HOLD',
            name: 'On Hold',
            stages: ['ON_HOLD']
        }
    ];

    // Map to quickly find which phase a stage belongs to
    stageToPhaseMap: { [key: string]: string } = {};

    // Data grouped by Phase ID
    phaseData: { [key: string]: Lead[] } = {};

    // Search
    allLeads: Lead[] = [];
    searchTerm: string = '';

    constructor(
        private leadService: LeadService,
        private router: Router,
        private toastService: ToastService
    ) {
        // Initialize maps and buckets
        this.phases.forEach(phase => {
            this.phaseData[phase.id] = [];
            phase.stages.forEach(stage => {
                this.stageToPhaseMap[stage] = phase.id;
            });
        });
    }

    ngOnInit(): void {
        this.loadLeads();
    }

    loadLeads() {
        this.leadService.getLeads().subscribe(leads => {
            this.allLeads = leads;
            this.distributeLeads();
        });
    }

    distributeLeads() {
        // Reset buckets
        this.phases.forEach(phase => this.phaseData[phase.id] = []);

        let filteredLeads = this.allLeads;

        // Filter
        if (this.searchTerm) {
            const lowerTerm = this.searchTerm.toLowerCase();
            filteredLeads = this.allLeads.filter(lead =>
                (lead.first_name + ' ' + lead.last_name).toLowerCase().includes(lowerTerm) ||
                lead.stage.toLowerCase().replace('_', ' ').includes(lowerTerm)
            );
        }

        // Distribute
        filteredLeads.forEach(lead => {
            const stageKey = lead.stage.toUpperCase();
            const phaseId = this.stageToPhaseMap[stageKey];

            if (phaseId && this.phaseData[phaseId]) {
                this.phaseData[phaseId].push(lead);
            }
        });
    }

    filterLeads(term: string) {
        this.searchTerm = term;
        this.distributeLeads();
    }

    drop(event: CdkDragDrop<Lead[]>, phaseId: string) {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            const lead = event.previousContainer.data[event.previousIndex];
            const targetPhase = this.phases.find(p => p.id === phaseId);

            if (!targetPhase || targetPhase.stages.length === 0) {
                this.toastService.error('Invalid target phase');
                return;
            }

            // Default to the first stage of the new phase
            const newStage = targetPhase.stages[0];

            // Optimistic Update
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex,
            );

            // Update local lead object immediately so badge updates
            const previousStage = lead.stage;
            lead.stage = newStage as LeadStage;

            // API Call
            this.leadService.transitionLead(lead.id, newStage, `Moved to ${targetPhase.name} phase`).subscribe({
                error: (err) => {
                    // Revert on failure
                    this.toastService.error('Failed to update stage: ' + err.message);
                    lead.stage = previousStage; // Revert stage
                    // Move back (simplified, might need more complex logic to revert position perfectly)
                    transferArrayItem(
                        event.container.data,
                        event.previousContainer.data,
                        event.currentIndex,
                        event.previousIndex
                    );
                }
            });
        }
    }

    openLead(lead: Lead) {
        this.router.navigate(['/dashboard/leads', lead.id]);
    }

    // Simplified ID generation
    getConnectedList(): string[] {
        return this.phases.map(p => 'phase-' + p.id);
    }

    getInitials(firstName: string, lastName: string): string {
        return (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
    }

    getAvatarColor(name: string): string {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    formatCurrency(value?: number): string {
        if (!value) return 'AED 0';
        return 'AED ' + value.toLocaleString();
    }

    getStageColor(stage: string): string {
        const stageColors: { [key: string]: string } = {
            'NEW_INQUIRY': '#3b82f6',      // Blue
            'QUALIFICATION': '#8b5cf6',   // Purple
            'DISCOVERY': '#6366f1',       // Indigo
            'PROPOSAL': '#f59e0b',        // Amber
            'NEGOTIATION': '#f97316',     // Orange
            'WON': '#10b981',             // Emerald
            'PROJECT_EXECUTION': '#0d9488', // Teal
            'DELIVERED': '#059669',       // Green
            'LOST': '#64748b',            // Slate
            'ON_HOLD': '#f43f5e'          // Rose
        };
        return stageColors[stage.toUpperCase()] || '#cbd5e1';
    }
}

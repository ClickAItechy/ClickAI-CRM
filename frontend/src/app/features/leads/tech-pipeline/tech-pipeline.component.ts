
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TechPipeline, TechPipelineStage } from '../../../core/models/lead.model';
import { TechPipelineService } from '../../../core/services/tech-pipeline.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-tech-pipeline',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './tech-pipeline.component.html',
    styleUrls: ['./tech-pipeline.component.css']
})
export class TechPipelineComponent implements OnInit {
    @Input() pipelineId: number | undefined;
    @Input() currentStage: TechPipelineStage = TechPipelineStage.PLANNING;
    @Input() initialNotes: string = '';

    stages = [
        { value: TechPipelineStage.PLANNING, label: 'Planning' },
        { value: TechPipelineStage.DESIGNING, label: 'Designing' },
        { value: TechPipelineStage.EXECUTING, label: 'Executing' },
        { value: TechPipelineStage.REVIEW, label: 'Review' },
        { value: TechPipelineStage.TESTING, label: 'Testing' }
    ];

    notes: string = '';
    visible: boolean = false;
    canEdit: boolean = false;
    saving: boolean = false;

    constructor(
        private techPipelineService: TechPipelineService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        if (this.initialNotes) {
            this.notes = this.initialNotes;
        }
        this.checkPermissions();
    }

    checkPermissions(): void {
        const user = this.authService.currentUserValue;
        if (!user) return;

        // Visibility: Admin, Tech, or explicit View permission
        this.visible = (
            user.team === 'ADMIN' ||
            user.team === 'TECH' ||
            user.view_tech_pipeline === true ||
            user.manage_tech_pipeline === true
        );

        // Editability: Admin, Tech (maybe?), or explicit Manage permission
        // Assuming Tech team can manage by default as per request "visible to tech login and admin"
        this.canEdit = (
            user.team === 'ADMIN' ||
            user.team === 'TECH' ||
            user.manage_tech_pipeline === true
        );
    }

    isCompleted(stage: TechPipelineStage): boolean {
        const stageOrder = [
            TechPipelineStage.PLANNING,
            TechPipelineStage.DESIGNING,
            TechPipelineStage.EXECUTING,
            TechPipelineStage.REVIEW,
            TechPipelineStage.TESTING
        ];
        return stageOrder.indexOf(stage) < stageOrder.indexOf(this.currentStage);
    }

    get progressPercentage(): number {
        const stageOrder = [
            TechPipelineStage.PLANNING,
            TechPipelineStage.DESIGNING,
            TechPipelineStage.EXECUTING,
            TechPipelineStage.REVIEW,
            TechPipelineStage.TESTING
        ];
        const index = stageOrder.indexOf(this.currentStage);
        return (index / (stageOrder.length - 1)) * 100;
    }

    setStage(stage: TechPipelineStage): void {
        if (!this.canEdit || !this.pipelineId || stage === this.currentStage) return;

        this.techPipelineService.updateStage(this.pipelineId, stage).subscribe({
            next: (updated) => {
                this.currentStage = updated.stage as TechPipelineStage;
            },
            error: (err) => console.error('Failed to update stage', err)
        });
    }

    saveNotes(): void {
        if (!this.canEdit || !this.pipelineId) return;

        this.saving = true;
        this.techPipelineService.updateNotes(this.pipelineId, this.notes).subscribe({
            next: () => {
                this.saving = false;
            },
            error: (err) => {
                console.error('Failed to update notes', err);
                this.saving = false;
            }
        });
    }
}

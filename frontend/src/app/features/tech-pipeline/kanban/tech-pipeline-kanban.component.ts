import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { TechPipeline, TechPipelineStage } from '../../../core/models/lead.model';

@Component({
    selector: 'app-tech-pipeline-kanban',
    standalone: true,
    imports: [CommonModule, DragDropModule],
    templateUrl: './tech-pipeline-kanban.component.html',
    styleUrls: ['./tech-pipeline-kanban.component.css']
})
export class TechPipelineKanbanComponent implements OnInit {
    stages = [
        { id: TechPipelineStage.PLANNING, name: 'Planning', icon: '📋' },
        { id: TechPipelineStage.DESIGNING, name: 'Designing', icon: '🎨' },
        { id: TechPipelineStage.EXECUTING, name: 'Executing', icon: '⚙️' },
        { id: TechPipelineStage.REVIEW, name: 'Review', icon: '🔍' },
        { id: TechPipelineStage.TESTING, name: 'Testing', icon: '🧪' }
    ];

    // Data grouped by stage
    stageData: { [key: string]: TechPipeline[] } = {};
    allPipelines: TechPipeline[] = [];

    constructor(
        private http: HttpClient,
        private router: Router,
        private toastService: ToastService
    ) {
        this.stages.forEach(stage => {
            this.stageData[stage.id] = [];
        });
    }

    ngOnInit(): void {
        this.loadPipelines();
    }

    loadPipelines() {
        this.http.get<TechPipeline[]>(`${environment.apiUrl}/tech-pipeline/`).subscribe({
            next: (pipelines) => {
                this.allPipelines = pipelines;
                this.distributePipelines();
            },
            error: (err) => {
                console.error('Failed to load tech pipelines', err);
                this.toastService.error('Failed to load Tech Pipelines');
            }
        });
    }

    distributePipelines() {
        this.stages.forEach(stage => this.stageData[stage.id] = []);

        this.allPipelines.forEach(pipeline => {
            const stageKey = pipeline.stage as TechPipelineStage;
            if (this.stageData[stageKey]) {
                this.stageData[stageKey].push(pipeline);
            }
        });
    }

    drop(event: CdkDragDrop<TechPipeline[]>, stageId: TechPipelineStage) {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            const pipeline = event.previousContainer.data[event.previousIndex];
            const previousStage = pipeline.stage;

            // Optimistic UI update
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex,
            );
            pipeline.stage = stageId;

            // API call
            this.http.patch(`${environment.apiUrl}/tech-pipeline/${pipeline.id}/`, { stage: stageId }).subscribe({
                next: () => {
                    this.toastService.success(`Moved to ${stageId}`);
                },
                error: (err) => {
                    // Revert on failure
                    this.toastService.error('Failed to update stage');
                    pipeline.stage = previousStage;
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

    openLead(pipeline: TechPipeline) {
        this.router.navigate(['/dashboard/leads', pipeline.lead]);
    }

    getConnectedList(): string[] {
        return this.stages.map(s => 'stage-' + s.id);
    }

    getAvatarColor(name: string): string {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    getInitials(name: string): string {
        if (!name) return '??';
        const parts = name.split(' ');
        return (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '');
    }
}

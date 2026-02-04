import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadDocument } from '../../../core/models/lead.model';
import { LeadService } from '../../../core/services/lead.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-document-upload-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './document-upload-modal.component.html',
    styleUrls: ['./document-upload-modal.component.css']
})
export class DocumentUploadModalComponent {
    @Input() leadId!: number;
    @Input() documents: LeadDocument[] = [];
    @Output() close = new EventEmitter<void>();
    @Output() refresh = new EventEmitter<void>();

    selectedFile: File | null = null;
    uploading = false;
    isDragging = false;

    constructor(
        private leadService: LeadService,
        private toastService: ToastService
    ) { }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;

        if (event.dataTransfer?.files.length) {
            this.selectedFile = event.dataTransfer.files[0];
            this.upload();
        }
    }

    onFileSelected(event: any) {
        this.selectedFile = event.target.files[0] || null;
        if (this.selectedFile) {
            this.upload();
        }
    }

    upload() {
        if (!this.selectedFile || !this.leadId) return;

        this.uploading = true;
        this.leadService.uploadDocument(this.leadId, this.selectedFile)
            .subscribe({
                next: () => {
                    this.uploading = false;
                    this.selectedFile = null;
                    this.toastService.success('Document uploaded successfully');
                    this.refresh.emit();
                },
                error: (err) => {
                    console.error('Upload failed', err);
                    this.uploading = false;
                    this.toastService.error('Failed to upload document');
                }
            });
    }

    deleteDoc(docId: number) {
        if (!confirm('Are you sure you want to delete this document?')) return;

        this.leadService.deleteDocument(docId).subscribe({
            next: () => this.refresh.emit(),
            error: () => alert('Failed to delete document.')
        });
    }

    closeModal() {
        this.close.emit();
    }

    getFileUrl(path: string): string {
        if (!path) return '#';

        // If it's an absolute URL (e.g. http://backend:8000/media/...),
        // convert it to a relative path so it's handled by the gateway.
        if (path.startsWith('http')) {
            try {
                const url = new URL(path);
                return url.pathname;
            } catch (e) {
                console.error('Invalid URL', path);
            }
        }

        if (path.startsWith('/media/')) {
            return path;
        }
        return `/media/${path}`;
    }
}

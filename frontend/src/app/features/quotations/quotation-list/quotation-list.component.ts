import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuotationService, Quotation } from '../quotation.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-quotation-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './quotation-list.component.html',
    styleUrls: ['./quotation-list.component.css']
})
export class QuotationListComponent implements OnInit {
    quotations: Quotation[] = [];
    isLoading = true;
    currentPage = 1;
    totalCount = 0;
    pageSize = 10;
    Math = Math;

    constructor(
        private quotationService: QuotationService
    ) { }

    ngOnInit(): void {
        this.loadQuotations();
    }

    loadQuotations(page: number = 1) {
        this.isLoading = true;
        this.quotationService.getQuotations(page).subscribe({
            next: (data) => {
                this.quotations = data.results || data;
                this.totalCount = data.count || this.quotations.length;
                this.currentPage = page;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading quotations', err);
                this.showToast('error', 'Failed to load quotations');
                this.isLoading = false;
            }
        });
    }

    deleteQuotation(id: number | undefined) {
        if (!id) return;

        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.quotationService.deleteQuotation(id).subscribe({
                    next: () => {
                        this.quotations = this.quotations.filter(quo => quo.id !== id);
                        this.showToast('success', 'Quotation deleted successfully');
                    },
                    error: (err) => {
                        console.error('Error deleting quotation', err);
                        this.showToast('error', 'Failed to delete quotation');
                    }
                });
            }
        });
    }

    downloadPdf(id: number | undefined) {
        if (!id) return;

        this.quotationService.downloadPdf(id).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Quotation-${id}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => {
                console.error('Download failed', err);
                this.showToast('error', 'Failed to download PDF');
            }
        });
    }

    onPageChange(page: number) {
        this.loadQuotations(page);
    }

    getTotalPages(): number {
        return Math.ceil(this.totalCount / this.pageSize);
    }

    private showToast(icon: 'success' | 'error' | 'warning' | 'info', title: string) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: icon,
            title: title
        });
    }
}

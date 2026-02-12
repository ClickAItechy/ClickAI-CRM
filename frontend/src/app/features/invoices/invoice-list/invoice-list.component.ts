import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InvoiceService, Invoice } from '../invoice.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-invoice-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './invoice-list.component.html',
    styleUrls: ['./invoice-list.component.css']
})
export class InvoiceListComponent implements OnInit {
    invoices: Invoice[] = [];
    isLoading = true;

    constructor(
        private invoiceService: InvoiceService
    ) { }

    ngOnInit(): void {
        this.loadInvoices();
    }

    loadInvoices() {
        this.isLoading = true;
        this.invoiceService.getInvoices().subscribe({
            next: (data) => {
                this.invoices = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading invoices', err);
                this.showToast('error', 'Failed to load invoices');
                this.isLoading = false;
            }
        });
    }

    deleteInvoice(id: number | undefined) {
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
                this.invoiceService.deleteInvoice(id).subscribe({
                    next: () => {
                        this.invoices = this.invoices.filter(inv => inv.id !== id);
                        this.showToast('success', 'Invoice deleted successfully');
                    },
                    error: (err) => {
                        console.error('Error deleting invoice', err);
                        this.showToast('error', 'Failed to delete invoice');
                    }
                });
            }
        });
    }

    downloadPdf(id: number | undefined) {
        if (!id) return;

        this.invoiceService.downloadPdf(id).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                window.open(url);
            },
            error: (err) => {
                console.error('Download failed', err);
                this.showToast('error', 'Failed to download PDF');
            }
        });
    }

    editInvoice(id: number | undefined) {
        // Handled via routerLink in template mostly, but kept for consistency if needed
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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InvoiceItem {
    name: string;
    price: number;
    quantity: string | number;
    subtotal: number;
}

export interface Invoice {
    id?: number;
    invoice_number?: string;
    client_name: string;
    client_email?: string;
    client_address?: string;
    items: InvoiceItem[];
    grand_total: number;
    issued_date?: string;
    created_at?: string;
    // Add other fields as needed
}

@Injectable({
    providedIn: 'root'
})
export class InvoiceService {
    private apiUrl = `${environment.apiUrl}/invoices/`;

    constructor(private http: HttpClient) { }

    getInvoices(): Observable<Invoice[]> {
        return this.http.get<Invoice[]>(this.apiUrl);
    }

    getInvoice(id: number): Observable<Invoice> {
        return this.http.get<Invoice>(`${this.apiUrl}${id}/`);
    }

    createInvoice(invoice: Invoice): Observable<Invoice> {
        return this.http.post<Invoice>(this.apiUrl, invoice);
    }

    updateInvoice(id: number, invoice: Invoice): Observable<Invoice> {
        return this.http.put<Invoice>(`${this.apiUrl}${id}/`, invoice);
    }

    deleteInvoice(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}${id}/`);
    }

    downloadPdf(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}${id}/download/`, { responseType: 'blob' });
    }
}

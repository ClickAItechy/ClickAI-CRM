import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface QuotationItem {
    name: string;
    price: number;
    quantity: string | number;
    subtotal: number;
}

export interface Quotation {
    id?: number;
    quotation_number?: string;
    client_name: string;
    client_email?: string;
    client_address?: string;
    items: QuotationItem[];
    grand_total: number;
    issued_date?: string;
    valid_until?: string;
    status?: string;
    created_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class QuotationService {
    private apiUrl = `${environment.apiUrl}/quotations/`;

    constructor(private http: HttpClient) { }

    getQuotations(page: number = 1): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}?page=${page}`);
    }

    getQuotation(id: number): Observable<Quotation> {
        return this.http.get<Quotation>(`${this.apiUrl}${id}/`);
    }

    createQuotation(quotation: Quotation): Observable<Quotation> {
        return this.http.post<Quotation>(this.apiUrl, quotation);
    }

    updateQuotation(id: number, quotation: Quotation): Observable<Quotation> {
        return this.http.put<Quotation>(`${this.apiUrl}${id}/`, quotation);
    }

    deleteQuotation(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}${id}/`);
    }

    downloadPdf(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}${id}/download/`, { responseType: 'blob' });
    }
}

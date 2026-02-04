import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Lead, LeadDocument } from '../models/lead.model';

@Injectable({
    providedIn: 'root'
})
export class LeadService {
    private apiUrl = `${environment.apiUrl}/leads`;

    constructor(private http: HttpClient) { }

    getLeads(): Observable<Lead[]> {
        return this.http.get<Lead[]>(this.apiUrl + '/');
    }

    getLeadById(id: number): Observable<Lead> {
        return this.http.get<Lead>(`${this.apiUrl}/${id}/`);
    }

    createLead(leadData: any): Observable<Lead> {
        return this.http.post<Lead>(this.apiUrl + '/', leadData);
    }

    updateLead(id: number, data: Partial<Lead>): Observable<Lead> {
        return this.http.patch<Lead>(`${this.apiUrl}/${id}/`, data);
    }

    transitionLead(id: number, newStage: string, notes: string): Observable<Lead> {
        return this.http.post<Lead>(`${this.apiUrl}/${id}/transition/`, { stage: newStage, notes });
    }

    assignLead(id: number, userId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/assign/`, { user_id: userId });
    }

    sendEmail(leadId: number, data: any): Observable<any> {
        // Mock API call
        console.log(`Sending email to lead ${leadId}:`, data);
        return new Observable(observer => {
            setTimeout(() => {
                observer.next({ success: true });
                observer.complete();
            }, 1000);
        });
    }

    uploadDocument(leadId: number, file: File): Observable<LeadDocument> {
        const formData = new FormData();
        formData.append('lead', leadId.toString());
        formData.append('file_path', file);

        return this.http.post<LeadDocument>(`${environment.apiUrl}/documents/`, formData);
    }

    deleteDocument(docId: number): Observable<any> {
        return this.http.delete(`${environment.apiUrl}/documents/${docId}/`);
    }

    getNotes(leadId: number): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/notes/?lead=${leadId}`);
    }

    createNote(noteData: any): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/notes/`, noteData);
    }

    bulkAssign(leadIds: number[], userId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/bulk_assign/`, { lead_ids: leadIds, user_id: userId });
    }

    getUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/users/`);
    }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TechPipeline } from '../models/lead.model';

@Injectable({
    providedIn: 'root'
})
export class TechPipelineService {
    private apiUrl = `${environment.apiUrl}/tech-pipeline/`;

    constructor(private http: HttpClient) { }

    getPipeline(id: number): Observable<TechPipeline> {
        return this.http.get<TechPipeline>(`${this.apiUrl}${id}/`);
    }

    updateStage(id: number, stage: string): Observable<TechPipeline> {
        return this.http.patch<TechPipeline>(`${this.apiUrl}${id}/`, { stage });
    }

    updateNotes(id: number, notes: string): Observable<TechPipeline> {
        return this.http.patch<TechPipeline>(`${this.apiUrl}${id}/`, { notes });
    }
}

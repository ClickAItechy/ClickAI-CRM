import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-deal-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './deal-list.component.html',
    styles: [] // Using global styles
})
export class DealListComponent implements OnInit {
    deals: any[] = [];
    searchTerm: string = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any[]>(`${environment.apiUrl}/deals/`).subscribe({
            next: (data) => this.deals = data,
            error: (err) => console.error('Failed to load deals', err)
        });
    }

    get filteredDeals() {
        if (!this.searchTerm) return this.deals;
        return this.deals.filter(deal =>
            deal.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            deal.stage.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
    }
}

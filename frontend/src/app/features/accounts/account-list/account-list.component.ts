import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-account-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './account-list.component.html',
    styles: [] // Using global styles
})
export class AccountListComponent implements OnInit {
    accounts: any[] = [];
    searchTerm: string = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any[]>(`${environment.apiUrl}/accounts/`).subscribe({
            next: (data) => this.accounts = data,
            error: (err) => console.error('Failed to load accounts', err)
        });
    }

    get filteredAccounts() {
        if (!this.searchTerm) return this.accounts;
        return this.accounts.filter(account =>
            account.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            (account.industry && account.industry.toLowerCase().includes(this.searchTerm.toLowerCase()))
        );
    }
}

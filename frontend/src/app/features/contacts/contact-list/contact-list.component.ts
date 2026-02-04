import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-contact-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './contact-list.component.html',
    styles: [] // Using global styles
})
export class ContactListComponent implements OnInit {
    contacts: any[] = [];
    searchTerm: string = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get<any[]>(`${environment.apiUrl}/contacts/`).subscribe({
            next: (data) => this.contacts = data,
            error: (err) => console.error('Failed to load contacts', err)
        });
    }

    get filteredContacts() {
        if (!this.searchTerm) return this.contacts;
        return this.contacts.filter(contact =>
            contact.first_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            contact.last_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            contact.email.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
    }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Breadcrumb {
    label: string;
    url: string;
}

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <nav class="breadcrumb-nav" *ngIf="breadcrumbs.length > 0">
            <ol class="breadcrumb-list">
                <li class="breadcrumb-item">
                    <a routerLink="/dashboard" class="breadcrumb-link home-link">
                        <span class="home-icon">🏠</span>
                        <span>Dashboard</span>
                    </a>
                </li>
                <li class="breadcrumb-item" *ngFor="let crumb of breadcrumbs; let last = last">
                    <span class="breadcrumb-separator">/</span>
                    <a *ngIf="!last" [routerLink]="crumb.url" class="breadcrumb-link">{{ crumb.label }}</a>
                    <span *ngIf="last" class="breadcrumb-current">{{ crumb.label }}</span>
                </li>
            </ol>
        </nav>
    `,
    styles: [`
        .breadcrumb-nav {
            padding: 0.75rem 0;
            margin-bottom: 1rem;
        }
        
        .breadcrumb-list {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            list-style: none;
            margin: 0;
            padding: 0;
        }
        
        .breadcrumb-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .breadcrumb-separator {
            color: #94a3b8;
            font-weight: 300;
        }
        
        .breadcrumb-link {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            color: #6366f1;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: color 0.2s;
        }
        
        .breadcrumb-link:hover {
            color: #4f46e5;
        }
        
        .home-icon {
            font-size: 1rem;
        }
        
        .breadcrumb-current {
            color: #475569;
            font-size: 0.9rem;
            font-weight: 600;
        }
    `]
})
export class BreadcrumbComponent implements OnInit {
    breadcrumbs: Breadcrumb[] = [];

    private routeLabels: { [key: string]: string } = {
        'leads': 'Leads',
        'pipeline': 'Pipeline',
        'new': 'New Lead',
        'tasks': 'Tasks',
        'reminders': 'Reminders',
        'reports': 'Reports',
        'deals': 'Deals',
        'accounts': 'Accounts',
        'contacts': 'Contacts',
        'teams': 'Teams',
        'notifications': 'Notifications',
        'admin': 'Admin',
        'settings': 'Settings',
        'users': 'Users',
        'onboarding': 'User Onboarding'
    };

    constructor(private router: Router) { }

    ngOnInit(): void {
        this.generateBreadcrumbs(this.router.url);
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.generateBreadcrumbs(event.urlAfterRedirects);
        });
    }

    private generateBreadcrumbs(url: string): void {
        const segments = url.split('/').filter(s => s && s !== 'dashboard');
        // Remove query params
        const cleanSegments = segments.map(s => s.split('?')[0]);

        this.breadcrumbs = [];
        let currentPath = '/dashboard';

        for (const segment of cleanSegments) {
            currentPath += '/' + segment;
            const label = this.routeLabels[segment] || this.formatLabel(segment);
            this.breadcrumbs.push({ label, url: currentPath });
        }
    }

    private formatLabel(segment: string): string {
        // If it's a number (likely an ID), use "Details"
        if (/^\d+$/.test(segment)) {
            return 'Details';
        }
        // Otherwise, capitalize
        return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    }
}

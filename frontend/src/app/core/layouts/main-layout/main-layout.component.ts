import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ChangePasswordModalComponent } from '../../../shared/components/change-password-modal/change-password-modal.component';
import { TeamService } from '../../services/team.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ChangePasswordModalComponent, BreadcrumbComponent],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit {
    isSidebarOpen = false;
    isSettingsOpen = false;
    isChangePasswordOpen = false;
    isTeamsMenuOpen = false;
    teams: any[] = [];
    unreadCount = 0;
    isDashboardRoute = true;

    constructor(
        public authService: AuthService,
        public router: Router,
        private teamService: TeamService
    ) { }

    ngOnInit() {
        if (this.authService.isLoggedIn()) {
            this.loadTeams();
        }
        this.checkRoute(this.router.url);
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.checkRoute(event.urlAfterRedirects);
        });
    }

    checkRoute(url: string): void {
        // Dashboard is exactly /dashboard (strip query params)
        const cleanUrl = url.split('?')[0];
        this.isDashboardRoute = cleanUrl === '/dashboard' || cleanUrl === '/dashboard/';
    }

    loadTeams() {
        this.teamService.getTeams().subscribe({
            next: (teams) => {
                this.teams = teams;
            },
            error: (err) => console.error('Failed to load teams', err)
        });
    }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    closeSidebar() {
        this.isSidebarOpen = false;
    }

    toggleSettings() {
        this.isSettingsOpen = !this.isSettingsOpen;
    }

    openChangePassword() {
        this.isChangePasswordOpen = true;
        this.isSettingsOpen = false;
    }

    toggleTeamsMenu() {
        this.isTeamsMenuOpen = !this.isTeamsMenuOpen;
    }

    logout() {
        this.authService.logout();
    }
}

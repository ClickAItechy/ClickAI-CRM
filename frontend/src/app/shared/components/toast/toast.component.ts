import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts$ | async" 
           class="toast" 
           [ngClass]="toast.type"
           [@toastAnimation]>
        <div class="toast-icon">
            <span *ngIf="toast.type === 'success'">✅</span>
            <span *ngIf="toast.type === 'error'">❌</span>
            <span *ngIf="toast.type === 'info'">ℹ️</span>
            <span *ngIf="toast.type === 'warning'">⚠️</span>
        </div>
        <div class="toast-content">
            <div class="toast-title" *ngIf="toast.title">{{ toast.title }}</div>
            <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close" (click)="remove(toast.id)">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none; /* Let clicks pass through container */
    }

    .toast {
      pointer-events: auto;
      min-width: 300px;
      max-width: 400px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 1rem;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      border-left: 4px solid transparent;
      overflow: hidden;
    }

    .toast.success { border-left-color: #10b981; }
    .toast.error { border-left-color: #ef4444; }
    .toast.info { border-left-color: #3b82f6; }
    .toast.warning { border-left-color: #f59e0b; }

    .toast-icon { font-size: 1.25rem; }
    
    .toast-content { flex: 1; }

    .toast-title {
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 2px;
      color: #111827;
    }

    .toast-message {
      font-size: 0.85rem;
      color: #4b5563;
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
      line-height: 1;
    }
    
    .toast-close:hover { color: #4b5563; }
  `],
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('0.3s cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('0.2s ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastComponent {
  toasts$ = this.toastService.toasts$;

  constructor(private toastService: ToastService) { }

  remove(id: number) {
    this.toastService.remove(id);
  }
}

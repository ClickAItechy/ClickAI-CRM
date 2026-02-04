import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
    id: number;
    title?: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toastsSubject = new BehaviorSubject<Toast[]>([]);
    public toasts$ = this.toastsSubject.asObservable();
    private counter = 0;

    constructor() { }

    show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) {
        const id = ++this.counter;
        const newToast: Toast = { id, message, type, title };

        const currentToasts = this.toastsSubject.value;
        // Append to top (or bottom depending on view preference, usually top-right means newest on top)
        this.toastsSubject.next([newToast, ...currentToasts]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            this.remove(id);
        }, 5000);
    }

    success(message: string, title: string = 'Success') {
        this.show(message, 'success', title);
    }

    error(message: string, title: string = 'Error') {
        this.show(message, 'error', title);
    }

    info(message: string, title: string = 'Info') {
        this.show(message, 'info', title);
    }

    warning(message: string, title: string = 'Warning') {
        this.show(message, 'warning', title);
    }

    remove(id: number) {
        const currentToasts = this.toastsSubject.value;
        this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
    }
}

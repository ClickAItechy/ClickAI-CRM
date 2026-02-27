import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoaderService {
    private isLoading = new BehaviorSubject<boolean>(false);
    public isLoading$ = this.isLoading.asObservable();
    private requestCount = 0;

    constructor() { }

    show() {
        this.requestCount++;
        if (this.requestCount === 1) {
            this.isLoading.next(true);
        }
    }

    hide() {
        if (this.requestCount > 0) {
            this.requestCount--;
        }
        if (this.requestCount === 0) {
            this.isLoading.next(false);
        }
    }
}

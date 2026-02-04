import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoaderService {
    private isLoading = new BehaviorSubject<boolean>(false);
    public isLoading$ = this.isLoading.asObservable();

    constructor() { }

    show() {
        this.isLoading.next(true);
    }

    hide() {
        this.isLoading.next(false);
    }
}

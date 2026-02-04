import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
    const loaderService = inject(LoaderService);

    // Optional: Skip loader for background polling if needed
    if (req.headers.has('X-Skip-Loader')) {
        return next(req);
    }

    loaderService.show();

    return next(req).pipe(
        finalize(() => loaderService.hide())
    );
};

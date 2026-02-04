import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError, switchMap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const user = authService.currentUserValue;
    const isLoggedIn = user && user.token;

    // Skip refresh logic for the token refresh request itself and the login request
    const isRefreshReq = req.url.includes('/token/refresh/');
    const isLoginReq = req.url.includes('/token/') && !isRefreshReq;

    if (isLoggedIn && !isRefreshReq) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${user.token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && !isRefreshReq && !isLoginReq) {
                // Auto logout if 401 response returned from api, but try refresh first
                return authService.refreshToken().pipe(
                    switchMap((newUser) => {
                        const retryReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${newUser.token}`
                            }
                        });
                        return next(retryReq);
                    }),
                    catchError((refreshError) => {
                        authService.logout();
                        return throwError(() => refreshError);
                    })
                );
            }

            // If it's a 401 on a refresh request, just logout
            if (error.status === 401 && isRefreshReq) {
                authService.logout();
            }

            return throwError(() => error);
        })
    );
};

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { catchError, switchMap, throwError, of } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = localStorage.getItem('accessToken');
  
  // Only add Authorization for our own API
  const isApiRequest = req.url.includes('localhost:3000') || !req.url.startsWith('http');
  
  let authReq = req;
  if (token && isApiRequest) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized, try to refresh token once
      if (error.status === 401 && isApiRequest && !req.url.includes('/refresh-token')) {
        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          return authService.refreshToken().pipe(
            switchMap((res: any) => {
              if (res.success) {
                authService.saveTokens(res.data);
                const retryReq = req.clone({
                  headers: req.headers.set('Authorization', `Bearer ${res.data.accessToken}`)
                });
                return next(retryReq);
              }
              // Refresh failed
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => error);
            }),
            catchError((refreshErr) => {
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => refreshErr);
            })
          );
        }
      }
      
      // If any other error or refresh token missing, just throw
      return throwError(() => error);
    })
  );
};

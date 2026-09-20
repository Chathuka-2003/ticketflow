import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const isAuthPublicEndpoint =
    req.url.endsWith('/auth/login') ||
    req.url.endsWith('/auth/register') ||
    req.url.endsWith('/auth/refresh');

  let cloned = req.clone({
    withCredentials: true,
  });

  if (token && !isAuthPublicEndpoint) {
    cloned = cloned.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthPublicEndpoint && token) {
        return authService.refreshToken().pipe(
          switchMap((updatedUser) => {
            const retried = req.clone({
              withCredentials: true,
              setHeaders: {
                Authorization: `Bearer ${updatedUser.accessToken}`,
              },
            });
            return next(retried);
          }),
          catchError((refreshErr) => {
            authService.clearSession();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

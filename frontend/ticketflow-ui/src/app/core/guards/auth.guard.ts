import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (auth.isAuthenticated()) {
    return true;
  }

  toast.warning('Authentication Required', 'Please sign in to continue with your booking.');
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const organizerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isAuthenticated()) {
    toast.warning('Organizer Access Required', 'Sign in with an ORGANIZER or ADMIN account.');
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url, role: 'ORGANIZER' },
    });
  }

  if (auth.isOrganizer()) {
    return true;
  }

  toast.error(
    'Insufficient Role Permissions',
    'This route requires ROLE_ORGANIZER or ROLE_ADMIN privileges.'
  );
  return router.createUrlTree(['/']);
};

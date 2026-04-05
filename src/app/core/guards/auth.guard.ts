import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // Check roles if defined in data
    const expectedRoles = route.data['roles'] as Array<string>;
    if (expectedRoles && expectedRoles.length > 0) {
      if (!authService.hasRole(expectedRoles)) {
        router.navigate(['/dashboard']);
        return false;
      }
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};

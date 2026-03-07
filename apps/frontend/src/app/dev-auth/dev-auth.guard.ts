import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DevAuthService } from './dev-auth.service';

export const devAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(DevAuthService);
  const router = inject(Router);
  if (authService.currentUserId()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

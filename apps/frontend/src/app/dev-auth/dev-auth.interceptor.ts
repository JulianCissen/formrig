import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { DevAuthService } from './dev-auth.service';

export const devAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const id = inject(DevAuthService).currentUserId();
  if (!id) return next(req);
  return next(req.clone({ headers: req.headers.set('X-Dev-User-Id', id) }));
};

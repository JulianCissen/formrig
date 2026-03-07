import type { CanActivateFn } from '@angular/router';
import type { HttpInterceptorFn } from '@angular/common/http';
import type { Route } from '@angular/router';
import type { Type } from '@angular/core';

export const devAuthGuard: CanActivateFn = () => true;
export const devAuthInterceptor: HttpInterceptorFn = (req, next) => next(req);
export const loginRoute: Route | null = null;
export const DevUserSwitcherComponent: Type<unknown> | null = null;

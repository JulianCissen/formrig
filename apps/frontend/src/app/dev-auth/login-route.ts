import type { Route } from '@angular/router';

export const loginRoute: Route = {
  path: 'login',
  loadComponent: () =>
    import('../pages/login/login.page').then(m => m.LoginPage),
};

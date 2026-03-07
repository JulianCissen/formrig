import { Routes } from '@angular/router';
import { AppShellComponent } from './app-shell/app-shell.component';
import { formLeaveGuard } from './guards/form-leave.guard';
import { devAuthGuard, loginRoute } from './dev-auth/dev-auth-features';

export const routes: Routes = [
  loginRoute,
  {
    path: '',
    component: AppShellComponent,
    canActivate: [devAuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/form-overview/form-overview.page').then(m => m.FormOverviewPage),
        title: 'Forms — FormRig',
      },
      {
        path: 'form/new',
        loadComponent: () =>
          import('./pages/create-form/create-form.page').then(m => m.CreateFormPage),
        title: 'New Form — FormRig',
      },
      {
        path: 'form/:id',
        loadComponent: () =>
          import('./pages/form-renderer/form-renderer.page').then(m => m.FormRendererPage),
        title: 'Form — FormRig',
        canDeactivate: [formLeaveGuard],
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
].filter(Boolean) as Routes;

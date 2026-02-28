import { Routes } from '@angular/router';
import { formLeaveGuard } from './guards/form-leave.guard';

export const routes: Routes = [
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
  {
    path: '**',
    redirectTo: '',
  },
];

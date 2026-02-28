import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink }                         from '@angular/router';
import { Router }                             from '@angular/router';
import { DatePipe }                          from '@angular/common';
import { Title }                              from '@angular/platform-browser';
import { MatProgressSpinnerModule }           from '@angular/material/progress-spinner';
import { MatCardModule }                      from '@angular/material/card';
import { MatButtonModule }                    from '@angular/material/button';
import { MatIconModule }                      from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar }     from '@angular/material/snack-bar';
import { PageWrapperComponent }               from '../../shared/page-wrapper/page-wrapper.component';
import { FormApiService }                     from '../../services/form-api.service';
import { FormSummary }                        from '../../models/form-api.model';

@Component({
  selector: 'app-form-overview-page',
  standalone: true,
  imports: [
    PageWrapperComponent,
    RouterLink,
    DatePipe,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <app-page-wrapper title="Forms">

      <!-- Loading -->
      @if (loading()) {
        <div class="spinner-wrap">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <p class="error-msg">{{ error() }}</p>
      }

      <!-- Empty state -->
      @if (!loading() && !error() && forms().length === 0) {
        <div class="empty-state">
          <p>No forms yet. <a routerLink="/form/new">Create your first form →</a></p>
        </div>
      }

      <!-- Form list -->
      @if (!loading() && forms().length > 0) {
        <div class="form-grid">
          @for (form of forms(); track form.id) {
            <mat-card
              class="form-card"
              (click)="navigateToForm(form.id)"
              role="button"
              [attr.aria-label]="'Open form: ' + form.title"
            >
              <mat-card-header>
                <mat-card-title>{{ form.title }}</mat-card-title>
                <mat-card-subtitle>{{ form.pluginId }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p class="date">Created {{ form.createdAt | date:'mediumDate' }}</p>
              </mat-card-content>
              <mat-card-actions class="card-actions">
                @if (confirmDeleteId() === form.id) {
                  <span class="delete-confirm-label">Delete this form?</span>
                  <button matButton (click)="onCancelDelete($event)">Cancel</button>
                  <button matButton (click)="onConfirmDelete($event, form.id)">Delete</button>
                } @else {
                  <button matIconButton aria-label="Delete form"
                          (click)="onDeleteClick($event, form.id)">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }

    </app-page-wrapper>
  `,
  styles: [`
    .spinner-wrap { display: flex; justify-content: center; padding: 2rem; }
    .error-msg    { color: var(--mat-warn-color, red); padding: 1rem 0; }
    .empty-state  { padding: 2rem 0; text-align: center; }
    .form-grid    { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; padding: 1rem 0; }
    .form-card    { cursor: pointer; transition: box-shadow 0.15s; }
    .form-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .date         { font-size: 0.8rem; color: var(--mat-secondary-text-color, #666); margin: 0; }
    .card-actions { display: flex; align-items: center; padding: 0 0.5rem; }
    .delete-confirm-label { flex: 1; font-size: 0.875rem; color: var(--mat-sys-error, #b00020); }
  `],
})
export class FormOverviewPage implements OnInit {
  private readonly api          = inject(FormApiService);
  private readonly router       = inject(Router);
  private readonly titleService = inject(Title);
  private readonly snackBar     = inject(MatSnackBar);

  forms           = signal<FormSummary[]>([]);
  loading         = signal(true);
  error           = signal<string | null>(null);
  confirmDeleteId = signal<string | null>(null);

  ngOnInit(): void {
    this.titleService.setTitle('Forms – FormRig');
    this.api.listForms().subscribe({
      next:  (forms) => { this.forms.set(forms); this.loading.set(false); },
      error: ()      => { this.error.set('Failed to load forms.'); this.loading.set(false); },
    });
  }

  navigateToForm(id: string): void {
    this.router.navigate(['/form', id]);
  }

  onDeleteClick(event: Event, id: string): void {
    event.stopPropagation();
    this.confirmDeleteId.set(id);
  }

  onCancelDelete(event: Event): void {
    event.stopPropagation();
    this.confirmDeleteId.set(null);
  }

  onConfirmDelete(event: Event, id: string): void {
    event.stopPropagation();
    this.api.deleteForm(id).subscribe({
      next: () => {
        this.forms.update(fs => fs.filter(f => f.id !== id));
        this.confirmDeleteId.set(null);
      },
      error: () => {
        this.snackBar.open('Failed to delete form.', 'Dismiss', { duration: 4000 });
        this.confirmDeleteId.set(null);
      },
    });
  }
}

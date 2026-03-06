import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink }                         from '@angular/router';
import { DatePipe }                           from '@angular/common';
import { Title }                              from '@angular/platform-browser';
import { MatProgressSpinnerModule }           from '@angular/material/progress-spinner';
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
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <app-page-wrapper title="Forms">

      <!-- New form CTA in the page header actions slot -->
      <a pageActions routerLink="/form/new" matButton="filled">
        <mat-icon aria-hidden="true">add</mat-icon>
        New form
      </a>

      <!-- Form count badge in the page subtitle slot — hidden during initial load -->
      @if (!loading()) {
        <span pageSubtitle class="form-count">
          {{ forms().length }} {{ forms().length === 1 ? 'form' : 'forms' }}
        </span>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="spinner-wrap">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <p class="error-msg" role="alert">{{ error() }}</p>
      }

      <!-- Cards grid -->
      @if (!loading() && !error() && forms().length > 0) {
        <div class="cards-grid">
          @for (form of forms(); track form.id) {
            <article class="form-card">
              <!-- Stretched link — sits outside footer so it is always in the tab order -->
              <a [routerLink]="['/form', form.id]" class="card-open-link">
                <span class="sr-only">Open {{ form.title || form.id }}</span>
              </a>

              <div class="card-body">
                <h2 class="card-title">{{ form.title }}</h2>
                <span class="type-badge">{{ form.pluginId }}</span>
                <div class="card-meta">
                  <mat-icon aria-hidden="true">calendar_today</mat-icon>
                  {{ form.createdAt | date:'mediumDate' }}
                </div>
              </div>
              <!-- Open action is handled by .card-open-link stretched-link above; footer contains delete-only per architecture decision -->
              <div class="card-footer">
                <div class="card-footer-actions">
                  @if (confirmDeleteId() === form.id) {
                    <span class="delete-confirm-label">Delete this form?</span>
                    <button matButton aria-label="Cancel delete"
                            (click)="onCancelDelete($event)">Cancel</button>
                    <button matButton [attr.aria-label]="'Delete ' + (form.title || form.id)"
                            (click)="onConfirmDelete($event, form.id)">Delete</button>
                  } @else {
                    <button matIconButton (click)="onDeleteClick($event, form.id)"
                            [attr.aria-label]="'Delete ' + (form.title || form.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && !error() && forms().length === 0) {
        <div class="empty-state">
          <mat-icon aria-hidden="true">article</mat-icon>
          <h2 class="empty-title">No forms yet</h2>
          <p class="empty-body">Create your first form to get started.</p>
          <a routerLink="/form/new" matButton="filled">
            <mat-icon aria-hidden="true">add</mat-icon>
            Create form
          </a>
        </div>
      }

    </app-page-wrapper>
  `,
  styleUrl: './form-overview.page.scss',
})
export class FormOverviewPage implements OnInit {
  private readonly api          = inject(FormApiService);
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

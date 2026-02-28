import { Component, inject, OnInit, signal } from '@angular/core';
import { Router }                             from '@angular/router';
import { Title }                              from '@angular/platform-browser';
import { MatButtonModule }                    from '@angular/material/button';
import { MatProgressSpinnerModule }           from '@angular/material/progress-spinner';
import { MatCardModule }                      from '@angular/material/card';
import { MatIconModule }                      from '@angular/material/icon';
import { PageWrapperComponent }               from '../../shared/page-wrapper/page-wrapper.component';
import { FormApiService }                     from '../../services/form-api.service';
import { FormTypeSummary }                    from '../../models/form-api.model';

@Component({
  selector: 'app-create-form-page',
  standalone: true,
  imports: [
    PageWrapperComponent,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
  ],
  template: `
    <app-page-wrapper title="New Form">

      <form class="create-form" (submit)="$event.preventDefault(); submit()" novalidate>

        <!-- Section A: Form type picker -->
        <section class="type-section">
          <h3 class="section-label">Form type</h3>

          <!-- Loading -->
          @if (typesLoading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="32" />
            </div>
          }

          <!-- Fetch error -->
          @if (typesError()) {
            <p class="error-msg">{{ typesError() }}</p>
          }

          <!-- Empty state -->
          @if (!typesLoading() && !typesError() && types().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">extension</mat-icon>
              <p>No form types are installed. Please add a plugin and restart the server.</p>
            </div>
          }

          <!-- Card grid -->
          @if (!typesLoading() && !typesError() && types().length > 0) {
            <div class="type-grid">
              @for (t of types(); track t.name) {
                <mat-card
                  class="type-card"
                  [class.type-card--selected]="selectedType()?.name === t.name"
                  (click)="selectType(t)"
                  (keydown.enter)="selectType(t)"
                  (keydown.space)="selectType(t); $event.preventDefault()"
                  role="button"
                  tabindex="0"
                  [attr.aria-pressed]="selectedType()?.name === t.name"
                  [attr.aria-label]="'Select form type: ' + t.name"
                >
                  <mat-card-header>
                    <mat-card-title>{{ t.name }}</mat-card-title>
                    <mat-card-subtitle>{{ t.description }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p class="type-version">v{{ t.version }}</p>
                  </mat-card-content>
                  <span class="type-card__check" aria-hidden="true">
                    <mat-icon>check</mat-icon>
                  </span>
                </mat-card>
              }
            </div>
          }
        </section>

        <!-- Section B: Submission error + button -->
        @if (submitError()) {
          <p class="error-msg">{{ submitError() }}</p>
        }

        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="saving() || !selectedType()"
        >
          @if (saving()) {
            <mat-spinner diameter="18" />
          } @else {
            <span>Create form</span>
          }
        </button>

      </form>

    </app-page-wrapper>
  `,
  styles: [`
    /* ── Form wrapper ────────────────────────────────────────────────────── */
    .create-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-6, 1.5rem);
      max-width: 680px;
      padding: var(--space-4, 1rem) 0;
    }

    /* ── Section label (M3 label-large) ─────────────────────────────────── */
    .section-label {
      margin: 0 0 var(--space-3, 0.75rem);
      font-size: 0.875rem;
      font-weight: 500;
      letter-spacing: 0.1px;
      line-height: 1.4;
      color: var(--mat-sys-on-surface-variant);
    }

    /* ── Type section ────────────────────────────────────────────────────── */
    .type-section {
      display: flex;
      flex-direction: column;
    }

    /* ── Loading spinner ─────────────────────────────────────────────────── */
    .spinner-wrap {
      display: flex;
      justify-content: center;
      padding: var(--space-6, 1.5rem);
    }

    /* ── Empty state ─────────────────────────────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3, 0.75rem);
      padding: var(--space-8, 2rem) 0;
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }

    .empty-state .empty-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: var(--mat-sys-outline);
      opacity: 0.7;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    /* ── Error message ───────────────────────────────────────────────────── */
    .error-msg {
      color: var(--mat-sys-error, red);
      margin: 0;
      font-size: 0.875rem;
    }

    /* ── Card grid ───────────────────────────────────────────────────────── */
    .type-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-4, 1rem);
    }

    /* ── Type card — base ────────────────────────────────────────────────── */
    .type-card {
      cursor: pointer;
      border: 2px solid transparent;
      position: relative;
      outline: none;
      transition:
        box-shadow       200ms var(--mat-sys-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)),
        border-color     200ms var(--mat-sys-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)),
        background-color 200ms var(--mat-sys-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1));
    }

    /* Hover */
    .type-card:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    /* Focus ring (keyboard navigation) */
    .type-card:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }

    /* Selected state — M3 tonal card */
    .type-card--selected {
      border-color: var(--mat-sys-primary, #6750a4);
      background-color: var(--mat-sys-secondary-container, #e8def8);
      box-shadow: 0 2px 8px rgba(103, 80, 164, 0.18);
    }

    /* ── Check badge ─────────────────────────────────────────────────────── */
    .type-card__check {
      display: none;
      position: absolute;
      top: var(--space-2, 0.5rem);
      right: var(--space-2, 0.5rem);
      width: 1.5rem;
      height: 1.5rem;
      border-radius: var(--radius-full, 9999px);
      background-color: var(--mat-sys-primary, #6750a4);
      color: var(--mat-sys-on-primary, #fff);
      align-items: center;
      justify-content: center;
    }

    .type-card--selected .type-card__check {
      display: flex;
    }

    .type-card__check mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      line-height: 1;
    }

    /* ── Card header typography ──────────────────────────────────────────── */
    .type-card mat-card-title {
      font-size: 1rem;
      font-weight: 500;
      line-height: 1.4;
      color: var(--mat-sys-on-surface);
      padding-right: var(--space-7, 1.75rem);
    }

    .type-card mat-card-subtitle {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant);
      margin-top: var(--space-1, 0.25rem);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    /* ── Version caption ────────────────────────────────────────────────── */
    .type-version {
      margin: var(--space-1, 0.25rem) 0 0;
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
      opacity: 0.7;
    }

    /* ── Submit button ───────────────────────────────────────────────────── */
    .create-form > button[mat-flat-button] {
      align-self: flex-start;
    }

    /* ── Spinner inside button ───────────────────────────────────────────── */
    button mat-spinner {
      display: inline-block;
    }
  `],
})
export class CreateFormPage implements OnInit {
  private readonly api          = inject(FormApiService);
  private readonly router       = inject(Router);
  private readonly titleService = inject(Title);

  // Type picker state
  types        = signal<FormTypeSummary[]>([]);
  typesLoading = signal(true);
  typesError   = signal<string | null>(null);
  selectedType = signal<FormTypeSummary | null>(null);

  // Submission state
  saving      = signal(false);
  submitError = signal<string | null>(null);

  ngOnInit(): void {
    this.titleService.setTitle('New Form – FormRig');
    this.api.getFormTypes().subscribe({
      next: (types) => {
        this.types.set(types);
        this.typesLoading.set(false);
      },
      error: () => {
        this.typesError.set('Failed to load form types.');
        this.typesLoading.set(false);
      },
    });
  }

  selectType(type: FormTypeSummary): void {
    this.selectedType.set(type);
  }

  submit(): void {
    const selected = this.selectedType();
    if (!selected) return;

    this.submitError.set(null);
    this.saving.set(true);

    this.api.createForm({ pluginId: selected.name }).subscribe({
      next:  (form) => this.router.navigate(['/form', form.id]),
      error: (err)  => {
        this.saving.set(false);
        this.submitError.set(err?.status === 404 ? 'Plugin not found.' : 'Failed to create form.');
      },
    });
  }
}

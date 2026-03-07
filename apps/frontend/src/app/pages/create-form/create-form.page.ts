import { Component, inject, OnInit, signal } from '@angular/core';
import { Router }                             from '@angular/router';
import { Title }                              from '@angular/platform-browser';
import { MatButtonModule }                    from '@angular/material/button';
import { MatProgressSpinnerModule }           from '@angular/material/progress-spinner';
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
    MatIconModule,
  ],
  template: `
    <app-page-wrapper title="New form">

      <div class="create-form">

        <div class="type-section">
          <span class="section-label">Choose a form type</span>

          <!-- Loading -->
          @if (typesLoading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="32" />
            </div>
          }

          <!-- Fetch error -->
          @if (typesError()) {
            <p class="error-msg" role="alert">{{ typesError() }}</p>
          }

          <!-- Empty state -->
          @if (!typesLoading() && !typesError() && types().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">extension</mat-icon>
              <p>No form types are installed. Please add a plugin and restart the server.</p>
            </div>
          }

          <!-- Type cards list -->
          @if (!typesLoading() && !typesError() && types().length > 0) {
            <div class="type-cards-list">
              @for (t of types(); track t.identifier) {
                <div class="type-card"
                     [class.type-card--selected]="selectedType()?.identifier === t.identifier"
                     (click)="selectType(t)"
                     (keydown.enter)="selectType(t)"
                     (keydown.space)="selectType(t); $event.preventDefault()"
                     role="button"
                     tabindex="0"
                     [attr.aria-pressed]="selectedType()?.identifier === t.identifier">
                  <div class="type-card-icon-area">
                    <mat-icon aria-hidden="true">description</mat-icon>
                  </div>
                  <div class="type-card-content">
                    <div class="type-card-name">{{ t.title }}</div>
                    <div class="type-card-description">{{ t.description }}</div>
                  </div>
                  <span class="version-badge">{{ t.version }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Submission error -->
        @if (submitError()) {
          <p class="error-msg" role="alert">{{ submitError() }}</p>
        }

        <div class="submit-section">
          <button matButton="filled" type="button"
                  [disabled]="saving() || !selectedType()"
                  (click)="submit()">
            @if (saving()) {
              <mat-spinner diameter="18" />
            } @else {
              <mat-icon aria-hidden="true">add</mat-icon>
            }
            <span>{{ saving() ? 'Creating…' : 'Create form' }}</span>
          </button>
        </div>

      </div>

    </app-page-wrapper>
  `,
  styleUrl: './create-form.page.scss',
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

    this.api.createForm({ pluginId: selected.identifier }).subscribe({
      next:  (form) => this.router.navigate(['/form', form.id]),
      error: (err)  => {
        this.saving.set(false);
        this.submitError.set(err?.status === 404 ? 'Plugin not found.' : 'Failed to create form.');
      },
    });
  }
}

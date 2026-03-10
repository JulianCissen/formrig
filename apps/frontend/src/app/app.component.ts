import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AppSettingsService } from './app-settings/app-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule, MatCardModule, MatIconModule, MatButtonModule],
  styleUrl: './app.component.scss',
  template: `
    @if (appSettings.status() === 'loading') {
      <div class="gate-shell" role="status" aria-label="Loading application">
        <mat-progress-spinner
          mode="indeterminate"
          diameter="48"
          aria-hidden="true"
        />
        <p class="gate-status-line">Loading…</p>
      </div>
    } @else if (appSettings.status() === 'error') {
      <div class="gate-shell" role="alert">
        <mat-card class="error-card" appearance="outlined">
          <mat-card-content>
            <mat-icon class="error-icon" aria-hidden="true">cloud_off</mat-icon>
            <h1 class="error-heading">Unable to load</h1>
            <p class="error-body">
              Could not reach the server. Please check your connection and try again.
            </p>
            <button
              matButton="filled"
              class="retry-btn"
              (click)="retry()"
              aria-label="Retry loading app settings">
              Retry
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    } @else {
      <router-outlet />
    }
  `,
})
export class AppComponent {
  protected readonly appSettings = inject(AppSettingsService);

  constructor() {
    this.appSettings.load();
  }

  protected retry(): void {
    this.appSettings.load();
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppSettingsSchema } from './app-settings.model';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly http = inject(HttpClient);

  readonly aiEnabled = signal<boolean>(false);
  readonly defaultInterface = signal<'form' | 'chat'>('form');
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');

  load(): void {
    this.status.set('loading');
    this.http.get<unknown>(`${API}/app-settings`).subscribe({
      next: (data) => {
        const result = AppSettingsSchema.safeParse(data);
        if (result.success) {
          this.aiEnabled.set(result.data.aiEnabled);
          this.defaultInterface.set(result.data.defaultInterface);
          this.status.set('ready');
        } else {
          this.status.set('error');
        }
      },
      error: () => {
        this.status.set('error');
      },
    });
  }
}

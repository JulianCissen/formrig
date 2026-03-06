import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

type ThemePreference = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'formrig-theme';
  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  private readonly systemDark = signal(this.mediaQuery.matches);

  readonly preference = signal<ThemePreference>(
    (localStorage.getItem(this.storageKey) as ThemePreference) ?? 'system'
  );

  readonly isDark = computed(() => {
    const pref = this.preference();
    if (pref === 'system') return this.systemDark();
    return pref === 'dark';
  });

  constructor() {
    this.mediaQuery.addEventListener('change', e => this.systemDark.set(e.matches));

    effect(() => {
      this.document.documentElement.classList.toggle('dark', this.isDark());
    });
  }

  toggle(): void {
    const next: ThemePreference = this.isDark() ? 'light' : 'dark';
    this.preference.set(next);
    localStorage.setItem(this.storageKey, next);
  }
}

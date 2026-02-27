import { InjectionToken } from '@angular/core';

/** Debounce delay in ms before an autosave HTTP request is sent. Default: 800 ms. */
export const AUTOSAVE_DELAY_MS = new InjectionToken<number>('AUTOSAVE_DELAY_MS', {
  providedIn: 'root',
  factory: () => 800,
});

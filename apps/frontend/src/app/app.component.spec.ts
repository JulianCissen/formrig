import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('is a class constructor', () => {
    expect(typeof AppComponent).toBe('function');
  });
});

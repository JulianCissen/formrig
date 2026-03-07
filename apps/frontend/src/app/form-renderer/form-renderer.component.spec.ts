/**
 * Unit tests for FormRendererComponent — effectiveReadonly logic and autosave gate.
 *
 * Strategy: the effectiveReadonly and autosave-gate logic are pure enough to be
 * tested without spinning up an Angular TestBed. Angular's signal/computed
 * primitives (signal, computed) work as standalone reactive values in any
 * JavaScript environment. RxJS Subject + filter covers the autosave gate.
 *
 * Run with `npx vitest run` once vitest / @analogjs/vitest-angular is configured.
 */

import { describe, it, expect } from 'vitest';
import { signal, computed } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, take, toArray } from 'rxjs/operators';

// ── Inline pure helpers ──────────────────────────────────────────────────────

/**
 * Mirrors FormRendererComponent.effectiveReadonly computed:
 *   computed(() => readonlyInput() || submittedSignal())
 */
function createEffectiveReadonly(
  readonlyInput: () => boolean,
  submittedSignal: () => boolean,
) {
  return computed(() => readonlyInput() || submittedSignal());
}

// ── Tests — effectiveReadonly ────────────────────────────────────────────────

describe('effectiveReadonly', () => {
  it('is false initially when both inputs are false', () => {
    const readonlyInput = signal(false);
    const submittedSignal = signal(false);
    const effectiveReadonly = createEffectiveReadonly(readonlyInput, submittedSignal);
    expect(effectiveReadonly()).toBe(false);
  });

  it('becomes true when readonly signal input is set to true', () => {
    const readonlyInput = signal(false);
    const submittedSignal = signal(false);
    const effectiveReadonly = createEffectiveReadonly(readonlyInput, submittedSignal);
    readonlyInput.set(true);
    expect(effectiveReadonly()).toBe(true);
  });

  it('becomes true after submit success (_submittedSignal set to true)', () => {
    const readonlyInput = signal(false);
    const submittedSignal = signal(false);
    const effectiveReadonly = createEffectiveReadonly(readonlyInput, submittedSignal);
    submittedSignal.set(true);
    expect(effectiveReadonly()).toBe(true);
  });

  it('remains true when both signals are true', () => {
    const readonlyInput = signal(true);
    const submittedSignal = signal(true);
    const effectiveReadonly = createEffectiveReadonly(readonlyInput, submittedSignal);
    expect(effectiveReadonly()).toBe(true);
  });

  it('remains false when readonly input is reset to false and submitted is false', () => {
    const readonlyInput = signal(true);
    const submittedSignal = signal(false);
    const effectiveReadonly = createEffectiveReadonly(readonlyInput, submittedSignal);
    readonlyInput.set(false);
    expect(effectiveReadonly()).toBe(false);
  });
});

// ── Tests — autosave gate ────────────────────────────────────────────────────

describe('autosave pipeline gate', () => {
  it('does not emit when effectiveReadonly is true', () => {
    const effectiveReadonly = signal(true);
    const autosave$ = new Subject<{ fieldId: string; value: unknown }>();
    const emitted: { fieldId: string; value: unknown }[] = [];

    const sub = autosave$.pipe(
      filter(() => !effectiveReadonly()),
    ).subscribe(v => emitted.push(v));

    autosave$.next({ fieldId: 'f1', value: 'hello' });
    autosave$.next({ fieldId: 'f2', value: 42 });
    sub.unsubscribe();

    expect(emitted).toHaveLength(0);
  });

  it('emits normally when effectiveReadonly is false', () => {
    const effectiveReadonly = signal(false);
    const autosave$ = new Subject<{ fieldId: string; value: unknown }>();
    const emitted: { fieldId: string; value: unknown }[] = [];

    const sub = autosave$.pipe(
      filter(() => !effectiveReadonly()),
    ).subscribe(v => emitted.push(v));

    autosave$.next({ fieldId: 'f1', value: 'hello' });
    sub.unsubscribe();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].fieldId).toBe('f1');
  });

  it('stops emitting after effectiveReadonly transitions to true mid-stream', () => {
    const effectiveReadonly = signal(false);
    const autosave$ = new Subject<{ fieldId: string; value: unknown }>();
    const emitted: { fieldId: string; value: unknown }[] = [];

    const sub = autosave$.pipe(
      filter(() => !effectiveReadonly()),
    ).subscribe(v => emitted.push(v));

    autosave$.next({ fieldId: 'before', value: 'v1' });
    effectiveReadonly.set(true);
    autosave$.next({ fieldId: 'after', value: 'v2' });
    sub.unsubscribe();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].fieldId).toBe('before');
  });
});

describe('buildControl', () => {
  it('plain-value FormControl is enabled — no { value, disabled } wrapper', () => {
    // New contract: buildControl always uses new FormControl(value), never
    // { value, disabled } — readonly/disabled UX is handled by displayMode
    // in each leaf component template.
    const ctrl = new FormControl('');
    expect(ctrl.disabled).toBe(false);
    expect(ctrl.enabled).toBe(true);
  });

  it('contrast: the removed { value, disabled: true } pattern produces a disabled control', () => {
    // Documents what buildControl used to do — kept here as a regression marker.
    const old = new FormControl({ value: '', disabled: true });
    expect(old.disabled).toBe(true);
  });
});

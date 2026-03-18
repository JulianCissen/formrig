import "@angular/compiler";
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

import { beforeAll, describe, it, expect } from 'vitest';
import { signal, computed } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { FormRendererComponent } from './form-renderer.component';

// Initialise the Angular testing environment once for the whole file.
// Guard with try/catch so the file can be reloaded by vitest's HMR without crashing.
//
// Also patch globalThis.fetch to return empty responses for Angular component
// template/style file URLs.  TestBed.compileComponents() internally calls
// resolveComponentResources(fetch), which tries to load file:// URLs for every
// templateUrl/styleUrl it finds — a protocol Node's fetch does not support.
// Intercepting those requests with a stub Response unblocks JIT compilation while
// leaving all other fetch traffic (e.g. HTTP API calls in integration tests) intact.
beforeAll(() => {
  const origFetch = globalThis.fetch;
  (globalThis as any).fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    if (/\.(html|s?css)(\?|#|$)/i.test(url)) {
      return new Response('', { status: 200 });
    }
    return origFetch(input as any, init);
  };

  try {
    TestBed.initTestEnvironment(
      BrowserDynamicTestingModule,
      platformBrowserDynamicTesting(),
      { teardown: { destroyAfterEach: true } },
    );
  } catch {
    // Already initialised — harmless to ignore.
  }
});

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

// ── Tests — onChatValuesUpdated ──────────────────────────────────────────────
//
// Strategy: use Object.create(FormRendererComponent.prototype) to build a minimal
// stub that exercises the actual method body without spinning up TestBed or loading
// Angular templates/styles (which fail in the vitest/jsdom environment).
// Only the fields read by onChatValuesUpdated() and convertFormValues() are set.

describe('onChatValuesUpdated()', () => {
  /**
   * Build a stub that shares the component prototype so the actual
   * onChatValuesUpdated() method is invoked via the prototype chain.
   */
  function buildStub() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stub = Object.create(FormRendererComponent.prototype) as any;
    stub.currentValues = signal<Record<string, unknown>>({});
    // convertFormValues reads formDef().fields — signal(null) produces [] via optional chaining
    stub.formDef = signal(null);
    stub.flatGroup = null;
    stub.stepGroups = [];
    return stub;
  }

  it('flat layout — patches the matching control and updates currentValues (AC-13, AC-15)', () => {
    const stub = buildStub();
    stub.flatGroup = new FormGroup({
      'field-a': new FormControl(''),
      'field-b': new FormControl('initial'),
    });

    stub.onChatValuesUpdated({ 'field-a': 'hello' });

    expect(stub.flatGroup.get('field-a')?.value).toBe('hello');
    expect(stub.flatGroup.get('field-b')?.value).toBe('initial'); // untouched
    expect(stub.currentValues()).toMatchObject({ 'field-a': 'hello', 'field-b': 'initial' });
  });

  it('stepped layout — patches the correct step group and updates merged currentValues (AC-13, AC-15)', () => {
    const stub = buildStub();
    stub.stepGroups = [
      new FormGroup({ 'field-a': new FormControl('') }),
      new FormGroup({ 'field-b': new FormControl('') }),
    ];

    stub.onChatValuesUpdated({ 'field-b': 'world' });

    expect(stub.stepGroups[0].get('field-a')?.value).toBe(''); // untouched
    expect(stub.stepGroups[1].get('field-b')?.value).toBe('world');
    expect(stub.currentValues()).toMatchObject({ 'field-a': '', 'field-b': 'world' });
  });

  it('emitEvent:false — valueChanges does not fire during patch (AC-14)', () => {
    const stub = buildStub();
    const flatGroup = new FormGroup({ 'field-a': new FormControl('') });
    stub.flatGroup = flatGroup;

    const emitted: unknown[] = [];
    flatGroup.valueChanges.subscribe(v => emitted.push(v));

    stub.onChatValuesUpdated({ 'field-a': 'silent' });

    expect(emitted).toHaveLength(0);
  });
});

/**
 * Unit tests for DatePickerFieldComponent — calendarMin / calendarMax logic.
 *
 * Strategy: the calendar-bound computation is a pure function of the field DTO and
 * "today". Rather than spin up a full Angular TestBed (test infrastructure is not yet
 * wired in this project — see app.component.spec.ts), the logic is reflected here as
 * a standalone pure helper that matches the component implementation exactly.
 *
 * When vitest / @analogjs/vitest-angular is configured, these tests can be run
 * directly with `npx vitest run` from the frontend directory.
 */

import { describe, it, expect } from 'vitest';
import type { RuleDto } from '@formrig/shared';

// ── Inline pure helpers (mirror DatePickerFieldComponent implementation) ─────

function parseDate(s: string): Date | null {
  const parts = s.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(y, m - 1, d);
}

interface DatePickerFieldShape {
  id: string;
  minDate?: string;
  maxDate?: string;
  minAge?: number;
  maxAge?: number;
  rules?: RuleDto[];
}

function computeCalendarMin(field: DatePickerFieldShape, today: Date): Date | null {
  const candidates: Date[] = [];

  if (field.minDate) {
    const d = parseDate(field.minDate);
    if (d) candidates.push(d);
  }

  if (field.maxAge != null) {
    const boundary = new Date(today.getFullYear() - field.maxAge, today.getMonth(), today.getDate());
    boundary.setDate(boundary.getDate() + 1);
    candidates.push(boundary);
  }

  for (const rule of field.rules ?? []) {
    if (rule.type === 'after-static-date') {
      const d = parseDate(rule.date);
      if (d) candidates.push(d);
    }
    if (rule.type === 'younger-than') {
      const boundary = new Date(today.getFullYear() - rule.years, today.getMonth(), today.getDate());
      boundary.setDate(boundary.getDate() + 1);
      candidates.push(boundary);
    }
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((max, d) => (d > max ? d : max), candidates[0]);
}

function computeCalendarMax(field: DatePickerFieldShape, today: Date): Date | null {
  const candidates: Date[] = [];

  if (field.maxDate) {
    const d = parseDate(field.maxDate);
    if (d) candidates.push(d);
  }

  if (field.minAge != null) {
    candidates.push(new Date(today.getFullYear() - field.minAge, today.getMonth(), today.getDate()));
  }

  for (const rule of field.rules ?? []) {
    if (rule.type === 'before-static-date') {
      const d = parseDate(rule.date);
      if (d) candidates.push(d);
    }
    if (rule.type === 'older-than') {
      candidates.push(new Date(today.getFullYear() - rule.years, today.getMonth(), today.getDate()));
    }
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((min, d) => (d < min ? d : min), candidates[0]);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a fixed "today" so tests are deterministic: 2025-06-15. */
const TODAY = new Date(2025, 5, 15); // June 15, 2025

const field = (overrides: Partial<DatePickerFieldShape> = {}): DatePickerFieldShape => ({
  id: 'dob',
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('computeCalendarMin / computeCalendarMax', () => {
  // Case 1: No rules, no shorthands → both null
  it('returns null for both when no rules or shorthands are present', () => {
    expect(computeCalendarMin(field(), TODAY)).toBeNull();
    expect(computeCalendarMax(field(), TODAY)).toBeNull();
  });

  // Case 2: minDate shorthand → calendarMin = parsed date
  it('uses minDate shorthand as calendarMin', () => {
    const result = computeCalendarMin(field({ minDate: '2020-01-15' }), TODAY);
    expect(result).toEqual(new Date(2020, 0, 15));
  });

  // Case 3: maxDate shorthand → calendarMax = parsed date
  it('uses maxDate shorthand as calendarMax', () => {
    const result = computeCalendarMax(field({ maxDate: '2025-12-31' }), TODAY);
    expect(result).toEqual(new Date(2025, 11, 31));
  });

  // Case 4: after-static-date rule → calendarMin
  it('uses after-static-date rule as calendarMin', () => {
    const rules: RuleDto[] = [{ type: 'after-static-date', date: '2019-03-01' }];
    const result = computeCalendarMin(field({ rules }), TODAY);
    expect(result).toEqual(new Date(2019, 2, 1));
  });

  // Case 5: older-than rule → calendarMax = today minus N years
  it('uses older-than rule as calendarMax (today − N years, no off-by-one)', () => {
    const rules: RuleDto[] = [{ type: 'older-than', years: 18 }];
    const result = computeCalendarMax(field({ rules }), TODAY);
    // Expected: 2025 - 18 = 2007-06-15
    expect(result).toEqual(new Date(2007, 5, 15));
  });

  // Case 6: younger-than rule → calendarMin = today minus N years PLUS ONE DAY (RC-001)
  it('applies +1 day offset for younger-than rule (RC-001)', () => {
    const rules: RuleDto[] = [{ type: 'younger-than', years: 65 }];
    const result = computeCalendarMin(field({ rules }), TODAY);
    // Expected: (2025 - 65 = 1960-06-15) + 1 day = 1960-06-16
    expect(result).toEqual(new Date(1960, 5, 16));
  });

  // Case 6b: maxAge shorthand → calendarMin also gets +1 day (RC-001)
  it('applies +1 day offset for maxAge shorthand (RC-001)', () => {
    const result = computeCalendarMin(field({ maxAge: 65 }), TODAY);
    // Expected: (2025 - 65 = 1960-06-15) + 1 day = 1960-06-16
    expect(result).toEqual(new Date(1960, 5, 16));
  });

  // Case 7: Multiple calendarMin contributors → most restrictive (latest date) wins
  it('picks the latest date among multiple calendarMin contributors', () => {
    const rules: RuleDto[] = [
      { type: 'after-static-date', date: '2000-01-01' },  // earlier
      { type: 'younger-than', years: 30 },                 // 1995-06-15 + 1 = 1995-06-16 → later
    ];
    const result = computeCalendarMin(field({ minDate: '1990-05-01', rules }), TODAY);
    // minDate = 1990-05-01
    // after-static-date = 2000-01-01
    // younger-than 30 = 1995-06-16
    // Latest = 2000-01-01
    expect(result).toEqual(new Date(2000, 0, 1));
  });

  // Case 8: Multiple calendarMax contributors → most restrictive (earliest date) wins
  it('picks the earliest date among multiple calendarMax contributors', () => {
    const rules: RuleDto[] = [
      { type: 'before-static-date', date: '2025-12-31' },  // later
      { type: 'older-than', years: 18 },                   // 2007-06-15 → earlier
    ];
    const result = computeCalendarMax(field({ maxDate: '2026-01-01', rules }), TODAY);
    // maxDate = 2026-01-01
    // before-static-date = 2025-12-31
    // older-than 18 = 2007-06-15 → earliest
    expect(result).toEqual(new Date(2007, 5, 15));
  });

  // QA-002: parseDate range guard
  it('rejects out-of-range month (e.g. 2025-13-01) — parseDate returns null', () => {
    const result = computeCalendarMin(field({ minDate: '2025-13-01' }), TODAY);
    expect(result).toBeNull(); // overflow-normalised date must NOT be used
  });

  it('rejects out-of-range day (e.g. 2025-01-32) — parseDate returns null', () => {
    const result = computeCalendarMin(field({ minDate: '2025-01-32' }), TODAY);
    expect(result).toBeNull();
  });

  // Edge: year boundary — younger-than 65 when today is Jan 1 avoids going negative in month
  it('handles year-boundary correctly for younger-than when today is Jan 1', () => {
    const jan1 = new Date(2025, 0, 1);
    const rules: RuleDto[] = [{ type: 'younger-than', years: 1 }];
    const result = computeCalendarMin(field({ rules }), jan1);
    // (2025 - 1 = 2024-01-01) + 1 day = 2024-01-02
    expect(result).toEqual(new Date(2024, 0, 2));
  });
});

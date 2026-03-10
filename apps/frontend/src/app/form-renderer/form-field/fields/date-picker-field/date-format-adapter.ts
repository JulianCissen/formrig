import { inject, Injectable, InjectionToken, WritableSignal } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';
import { parseDisplayDate, formatIsoDate } from './date-format.util';

/**
 * Per-component writable signal carrying the active display format string
 * (e.g. `'dd-mm-yyyy'`).  Provided at the DatePickerFieldComponent level so
 * each component instance gets its own isolated format signal, which is
 * injected into FormrigDateAdapter to drive both parsing and formatting.
 */
export const DISPLAY_FORMAT_TOKEN = new InjectionToken<WritableSignal<string>>('DISPLAY_FORMAT');

/**
 * Custom DateAdapter that wires Material's datepicker to the field's
 * `displayFormat` instead of the browser's locale.
 *
 * - `parse`       — uses `parseDisplayDate` so user-typed text (e.g. `01-01-2025`
 *                   with format `dd-mm-yyyy`) is understood by Material on every
 *                   keystroke.  Without this, `new Date('01-01-2025')` returns
 *                   `Invalid Date` in most browsers, causing Material to clear the
 *                   input on blur.
 * - `format`      — uses `formatIsoDate` so Material displays dates in our format
 *                   instead of the browser locale string (e.g. `1/1/2025`).
 * - `deserialize` — overridden to parse ISO strings (`yyyy-mm-dd`) as *local*
 *                   midnight instead of UTC midnight, preventing off-by-one-day
 *                   errors in non-UTC timezones when dates are written back via
 *                   `writeValue`.
 */
@Injectable()
export class FormrigDateAdapter extends NativeDateAdapter {
  private readonly fmt = inject(DISPLAY_FORMAT_TOKEN);

  /**
   * Parse user-typed input according to the active display format.
   * Returns `null` for incomplete or invalid input so Material leaves the
   * `nativeElement.value` intact (rather than clearing it as it would for an
   * internally `Invalid Date`).
   */
  override parse(value: any): Date | null {
    if (typeof value !== 'string' || !value) return null;
    const iso = parseDisplayDate(value.trim(), this.fmt());
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    // Use local midnight (new Date(y, m-1, d)) — same as NativeDateAdapter's
    // internal comparisons — to avoid UTC/local mismatch in compareDate.
    return new Date(y, m - 1, d);
  }

  /**
   * Format a Date for display using the active display format.
   * Uses LOCAL date parts to be consistent with `parse` and `compareDate`.
   */
  override format(date: Date, _displayFormat: any): string {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return formatIsoDate(`${y}-${m}-${d}`, this.fmt());
  }

  /**
   * Deserialise a raw value (e.g. ISO string from `ctrl.setValue`) into a Date.
   * Overridden to parse ISO strings as LOCAL midnight rather than UTC midnight
   * so that `format(deserialize('2025-01-01'))` round-trips correctly in all
   * timezones.
   */
  override deserialize(value: any): Date | null {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return this.isValid(dt) ? dt : null;
    }
    return super.deserialize(value);
  }
}

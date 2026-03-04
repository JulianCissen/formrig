import { AfterViewInit, Component, DestroyRef, ElementRef, Input, OnInit, ViewChild, computed, inject, input, isDevMode, signal, Signal } from '@angular/core';
import { parseDisplayDate, formatIsoDate } from './date-format.util';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlContainer, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldDto } from '@formrig/shared';

@Component({
  selector: 'app-date-picker-field',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './date-picker-field.component.html',
  styleUrl: './date-picker-field.component.scss',
  viewProviders: [{
    provide: ControlContainer,
    useFactory: () => inject(ControlContainer, { skipSelf: true }),
  }],
})
export class DatePickerFieldComponent implements OnInit, AfterViewInit {
  readonly field = input.required<Extract<FieldDto, { type: 'date-picker' }>>();

  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
  @Input() onBlur: (fieldId: string) => void = () => {};

  @ViewChild('inputRef') private inputRef!: ElementRef<HTMLInputElement>;

  private readonly controlContainer = inject(ControlContainer);
  private readonly destroyRef = inject(DestroyRef);

  protected get control(): FormControl<string | null> {
    return this.controlContainer.control!.get(this.field().id) as FormControl<string | null>;
  }

  protected readonly isTouchDevice = signal(
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );

  /** Resolved display format — uses field's displayFormat or falls back to 'dd-mm-yyyy'. */
  protected readonly activeFormat = computed((): string => this.field().displayFormat ?? 'dd-mm-yyyy');

  /**
   * Hint text for the date-picker input. Always includes the active display format.
   * If the field has a `hint`, the format is appended: "<hint> (dd-mm-yyyy)".
   * Otherwise, the format is the hint: "dd-mm-yyyy".
   */
  protected readonly computedHint = computed((): string | undefined => {
    const fmt = this.activeFormat();
    const h = this.field().hint;
    return h ? `${h} (${fmt})` : fmt;
  });

  ngOnInit(): void {
    const ctrl = this.control;
    ctrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
        if ((v as unknown) instanceof Date) {
          // CVA committed a Date object at blur — convert to yyyy-mm-dd using local time
          const date = v as unknown as Date;
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          const iso = `${y}-${m}-${d}`;
          // Re-set to ISO string; next emission will carry the correct string value
          ctrl.setValue(iso);
          if (this.inputRef?.nativeElement) {
            this.inputRef.nativeElement.value = formatIsoDate(iso, this.activeFormat());
          }
          // _controlValue.set is handled by the next emission (which will be the iso string)
          return;
        }
        if (this.inputRef?.nativeElement) {
          this.inputRef.nativeElement.value = formatIsoDate(v as string | null, this.activeFormat());
        }
      });

    if (isDevMode()) {
      const min = this.calendarMin();
      const max = this.calendarMax();
      if (min && max && min > max) {
        console.warn(
          `[DatePickerField] calendarMin is after calendarMax for field "${this.field().id}" — all dates will be disabled.`
        );
      }
    }
  }

  ngAfterViewInit(): void {
    // Defer the initial display-format write to a microtask so it runs after the
    // current Angular rendering cycle completes. Writing nativeElement.value
    // synchronously in ngAfterViewInit triggers MatInput._dirtyCheckNativeValue()
    // → stateChanges.next() → MatFormField.markForCheck() mid-render, which can
    // cause MatFormField's afterRenderEffect to see a transient content-child
    // query state and throw "mat-form-field must contain a MatFormFieldControl".
    Promise.resolve().then(() => {
      if (this.inputRef?.nativeElement) {
        this.inputRef.nativeElement.value = formatIsoDate(this.control.value, this.activeFormat());
      }
    });
  }

  /** Parses a yyyy-mm-dd string to a local Date, or returns null.
   * Returns null for out-of-range month/day values to prevent JS overflow normalisation
   * (e.g. "2025-13-01" would silently become 2026-01-01 without this guard).
   * A round-trip check catches valid-month overflow (e.g. "2025-02-30" → March 2).
   */
  private parseDate(s: string): Date | null {
    const parts = s.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  protected readonly calendarMin = computed((): Date | null => {
    const f = this.field();
    const today = new Date();
    const candidates: Date[] = [];

    // minDate shorthand — earliest selectable date
    if (f.minDate) {
      const d = this.parseDate(f.minDate);
      if (d) candidates.push(d);
    }

    // maxAge shorthand — earliest allowable birthdate (today − maxAge years).
    // maxAge is inclusive: a person born exactly on (today − maxAge years) has age === maxAge
    // which is still within the allowed range, so that date IS selectable (no +1 offset needed).
    if (f.maxAge != null) {
      const boundary = new Date(today.getFullYear() - f.maxAge, today.getMonth(), today.getDate());
      candidates.push(boundary);
    }

    for (const rule of f.rules ?? []) {
      // AfterStaticDateRule — calendar lower bound
      if (rule.type === 'after-static-date') {
        const d = this.parseDate(rule.date);
        if (d) candidates.push(d);
      }
      // YoungerThanRule — earliest allowable birthdate (today − years).
      // +1 day: the exact boundary date is rejected by the strict < comparison in
      // YoungerThanRule.matches(), so the calendar must not show it as selectable.
      if (rule.type === 'younger-than') {
        const boundary = new Date(today.getFullYear() - rule.years, today.getMonth(), today.getDate());
        boundary.setDate(boundary.getDate() + 1);
        candidates.push(boundary);
      }
    }

    if (candidates.length === 0) return null;
    return candidates.reduce((max, d) => (d > max ? d : max), candidates[0]);
  });

  protected readonly calendarMax = computed((): Date | null => {
    const f = this.field();
    const today = new Date();
    const candidates: Date[] = [];

    // maxDate shorthand — latest selectable date
    if (f.maxDate) {
      const d = this.parseDate(f.maxDate);
      if (d) candidates.push(d);
    }

    // minAge shorthand — latest allowable birthdate (today − minAge years)
    if (f.minAge != null) {
      candidates.push(new Date(today.getFullYear() - f.minAge, today.getMonth(), today.getDate()));
    }

    for (const rule of f.rules ?? []) {
      // BeforeStaticDateRule — calendar upper bound
      if (rule.type === 'before-static-date') {
        const d = this.parseDate(rule.date);
        if (d) candidates.push(d);
      }
      // OlderThanRule — latest allowable birthdate (today − years)
      if (rule.type === 'older-than') {
        candidates.push(new Date(today.getFullYear() - rule.years, today.getMonth(), today.getDate()));
      }
    }

    if (candidates.length === 0) return null;
    return candidates.reduce((min, d) => (d < min ? d : min), candidates[0]);
  });

  protected onDateChange(event: MatDatepickerInputEvent<Date>): void {
    const d = event.value;
    if (!d) {
      this.control.setValue(null);
      return;
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.control.setValue(`${yyyy}-${mm}-${dd}`);
    this.inputRef.nativeElement.value = formatIsoDate(`${yyyy}-${mm}-${dd}`, this.activeFormat());
  }

  protected clearDate(): void {
    this.control.setValue(null);
    this.inputRef.nativeElement.focus();
  }

  protected onInputBlur(): void {
    const raw = this.inputRef.nativeElement.value.trim();
    if (raw === '') {
      this.onBlur(this.field().id);
      return;
    }
    const iso = parseDisplayDate(raw, this.activeFormat());
    if (iso !== null) {
      this.control.setValue(iso);
      this.inputRef.nativeElement.value = formatIsoDate(iso, this.activeFormat());
    } else {
      this.control.setValue(null);
      this.inputRef.nativeElement.value = '';
    }
    this.onBlur(this.field().id);
  }
}

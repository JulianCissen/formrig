import { Component, Input, computed, signal, Signal, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { FieldDto } from '@formrig/shared';
import { FieldDisplayValueComponent } from '../../wrappers/field-display-value.component';

@Component({
  selector: 'app-number-field',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    ReactiveFormsModule,
    FieldDisplayValueComponent,
  ],
  templateUrl: './number-field.component.html',
  styleUrl: './number-field.component.scss',
  // No ControlContainer viewProviders — FormControl is passed directly via @Input (ADR-008)
})
export class NumberFieldComponent {
  readonly field = input.required<Extract<FieldDto, { type: 'number' }>>();
  readonly readonly = input<boolean>(false);

  @Input() control?: FormControl<string>;
  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
  @Input() currentValues: Signal<Record<string, unknown>> = signal({});
  @Input() onBlur: (fieldId: string) => void = () => {};

  readonly displayMode = computed(() => this.readonly() || this.field().disabled);

  readonly displayValue = computed((): string | null => {
    const v = this.currentValues()[this.field().id];
    return v !== null && v !== undefined && v !== '' ? String(v) : null;
  });

  /** WCAG 2.1 AA: range constraint communicated via mat-hint text. */
  readonly rangeHint = computed((): string | null => {
    const { min, max } = this.field();
    if (min != null && max != null) return `Enter a whole number between ${min} and ${max}`;
    if (min != null) return `Enter a whole number (minimum ${min})`;
    if (max != null) return `Enter a whole number (maximum ${max})`;
    return null;
  });

  /** Combines field().hint and rangeHint() with ' · ' separator when both are present. */
  readonly combinedHint = computed((): string | null => {
    const parts = [this.field().hint, this.rangeHint()].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  });

  readonly hasError = computed(() =>
    this.dirtyFieldIds().has(this.field().id) &&
    (this.validationState().get(this.field().id)?.length ?? 0) > 0
  );

  /** Strip any character that is not a digit or a leading minus sign. Handles keyboard + paste. */
  filterInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    const isNegative = raw.startsWith('-');
    const digits = raw.replace(/[^0-9]/g, '');
    const filtered = (isNegative ? '-' : '') + digits;
    if (raw !== filtered) {
      input.value = filtered;
      this.control?.setValue(filtered, { emitEvent: true });
    }
  }
}

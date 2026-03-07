import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-field-display-value',
  standalone: true,
  imports: [],
  templateUrl: './field-display-value.component.html',
  styleUrl: './field-display-value.component.scss',
})
export class FieldDisplayValueComponent {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input<string | string[] | null>(null);
  readonly displayType = input<'text' | 'multi'>('text');

  readonly displayText = computed(() => {
    const v = this.value();
    if (v === null || v === undefined || v === '') return null;
    if (this.displayType() === 'multi' || Array.isArray(v)) {
      const arr = Array.isArray(v) ? v : [v];
      return arr.length === 0 ? null : arr.join(', ');
    }
    return String(v);
  });

  readonly isEmpty = computed(() => this.displayText() === null);
}

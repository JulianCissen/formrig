import { Component, Input, computed, inject, signal, Signal, input } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FieldDto } from '@formrig/shared';
import { FieldPlainWrapperComponent } from '../wrappers/field-plain-wrapper.component';
import { FieldDisplayValueComponent } from '../wrappers/field-display-value.component';

@Component({
  selector: 'app-checkbox-field',
  standalone: true,
  imports: [
    MatCheckboxModule,
    ReactiveFormsModule,
    FieldPlainWrapperComponent,
    FieldDisplayValueComponent,
  ],
  templateUrl: './checkbox-field.component.html',
  styleUrl: './checkbox-field.component.scss',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
})
export class CheckboxFieldComponent {
  readonly field = input.required<Extract<FieldDto, { type: 'checkbox' }>>();
  readonly readonly = input<boolean>(false);

  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
  @Input() currentValues: Signal<Record<string, unknown>> = signal({});
  @Input() onBlur: (fieldId: string) => void = () => {};

  readonly displayMode = computed(() => this.readonly() || this.field().disabled);
  readonly displayValue = computed((): string | null => {
    const v = this.currentValues()[this.field().id];
    return v === true ? 'Yes' : v === false ? 'No' : null;
  });
}

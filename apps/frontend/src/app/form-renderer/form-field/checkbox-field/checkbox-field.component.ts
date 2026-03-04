import { Component, Input, inject, signal, Signal, input } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FieldDto } from '@formrig/shared';
import { FieldPlainWrapperComponent } from '../wrappers/field-plain-wrapper.component';

@Component({
  selector: 'app-checkbox-field',
  standalone: true,
  imports: [
    MatCheckboxModule,
    ReactiveFormsModule,
    FieldPlainWrapperComponent,
  ],
  templateUrl: './checkbox-field.component.html',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
})
export class CheckboxFieldComponent {
  readonly field = input.required<Extract<FieldDto, { type: 'checkbox' }>>();

  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
  @Input() onBlur: (fieldId: string) => void = () => {};
}

import { Component, Input, inject, signal, Signal, input } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { FieldDto } from '@formrig/shared';
import { FieldPlainWrapperComponent } from '../wrappers/field-plain-wrapper.component';

@Component({
  selector: 'app-radio-field',
  standalone: true,
  imports: [
    MatRadioModule,
    ReactiveFormsModule,
    FieldPlainWrapperComponent,
  ],
  templateUrl: './radio-field.component.html',
  styleUrl: './radio-field.component.scss',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
})
export class RadioFieldComponent {
  readonly field = input.required<Extract<FieldDto, { type: 'radio' }>>();

  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
  @Input() onBlur: (fieldId: string) => void = () => {};
}

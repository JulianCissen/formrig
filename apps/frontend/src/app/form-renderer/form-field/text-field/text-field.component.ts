import { Component, Input, computed, inject, signal, Signal, input } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldDto } from '@formrig/shared';
import { FieldDisplayValueComponent } from '../wrappers/field-display-value.component';

@Component({
  selector: 'app-text-field',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ReactiveFormsModule,
    FieldDisplayValueComponent,
  ],
  templateUrl: './text-field.component.html',
  styleUrl: './text-field.component.scss',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
})
export class TextFieldComponent {
  readonly field = input.required<Extract<FieldDto, { type: 'text' }>>();
  readonly readonly = input<boolean>(false);

  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
  @Input() currentValues: Signal<Record<string, unknown>> = signal({});
  @Input() onBlur: (fieldId: string) => void = () => {};

  readonly displayMode = computed(() => this.readonly() || this.field().disabled);
  readonly displayValue = computed(() => String(this.currentValues()[this.field().id] ?? ''));
}

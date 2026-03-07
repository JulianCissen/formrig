import { Component, Input, computed, inject, signal, Signal, input } from '@angular/core';
import { AbstractControl, ControlContainer, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldDto } from '@formrig/shared';
import { FieldDisplayValueComponent } from '../wrappers/field-display-value.component';

@Component({
  selector: 'app-multi-select-field',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    ReactiveFormsModule,
    FieldDisplayValueComponent,
  ],
  templateUrl: './multi-select-field.component.html',
  styleUrl: './multi-select-field.component.scss',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
})
export class MultiSelectFieldComponent {
  private readonly controlContainer = inject(ControlContainer);

  readonly field = input.required<Extract<FieldDto, { type: 'multi-select' }>>();
  readonly readonly = input<boolean>(false);

  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
  @Input() currentValues: Signal<Record<string, unknown>> = signal({});
  @Input() onBlur: (fieldId: string) => void = () => {};

  readonly displayMode = computed(() => this.readonly() || this.field().disabled);
  readonly displayValue = computed((): string[] => {
    const v = this.currentValues()[this.field().id];
    return Array.isArray(v) ? v : [];
  });

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly chipInputText = signal<Record<string, string>>({});

  get currentFormGroup(): FormGroup {
    return this.controlContainer.control as FormGroup;
  }

  filteredChipOptions(fieldId: string, options: string[]): string[] {
    const currentValues = (this.currentValues()[fieldId] as string[] | undefined) ?? [];
    const inputText = (this.chipInputText()[fieldId] ?? '').toLowerCase();
    return options.filter(
      opt => !currentValues.includes(opt) && (inputText === '' || opt.toLowerCase().includes(inputText))
    );
  }

  selectChipOption(
    fieldId: string,
    event: MatAutocompleteSelectedEvent,
    inputEl: HTMLInputElement,
    trigger: MatAutocompleteTrigger,
    formGroup: AbstractControl | null
  ): void {
    const control = this.currentFormGroup.get(fieldId);
    if (!control) return;
    const current: string[] = (control.value ?? []) as string[];
    if (!current.includes(event.option.value as string)) {
      control.setValue([...current, event.option.value as string]);
      control.markAsDirty();
    }
    inputEl.value = '';
    this.chipInputText.update(map => ({ ...map, [fieldId]: '' }));

    const realClose = trigger.closePanel.bind(trigger);
    trigger.closePanel = () => {};
    queueMicrotask(() => {
      trigger.closePanel = realClose;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = trigger as any;
      t._closingActionsSubscription = t._subscribeToClosingActions();
      inputEl.focus();
    });
  }

  removeChip(fieldId: string, value: string, formGroup: AbstractControl | null): void {
    const control = formGroup?.get(fieldId);
    if (!control) return;
    const current: string[] = (control.value ?? []) as string[];
    control.setValue(current.filter(v => v !== value));
    control.markAsDirty();
  }

  onChipInputChange(fieldId: string, value: string): void {
    this.chipInputText.update(map => ({ ...map, [fieldId]: value }));
  }
}

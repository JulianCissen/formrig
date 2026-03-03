import { Component, Input, inject, input, signal, Signal, WritableSignal } from '@angular/core';
import { AbstractControl, ControlContainer, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FieldDto } from '@formrig/shared';
import { FileUploadEntry } from '../file-upload-entry.model';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [
    A11yModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    MatCheckboxModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    ReactiveFormsModule,
  ],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
})
export class FormFieldComponent {
  private readonly controlContainer = inject(ControlContainer);

  readonly field = input.required<FieldDto>();

  @Input() uploadEntries!: Signal<Map<string, FileUploadEntry[]>>;
  @Input() dragOverFieldId!: WritableSignal<string | null>;
  @Input() onFileChange!: (event: Event, fieldId: string) => void;
  @Input() onDragOver!: (event: DragEvent, fieldId: string) => void;
  @Input() onDragLeave!: (event: DragEvent, fieldId: string) => void;
  @Input() onDrop!: (event: DragEvent, fieldId: string) => void;
  @Input() openFile!: (entry: FileUploadEntry) => void;
  @Input() dismissError!: (fieldId: string, clientId: string) => void;
  @Input() deleteUploadedFile!: (fieldId: string, entry: FileUploadEntry) => void;

  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
  @Input() currentValues: Signal<Record<string, unknown>> = signal({});
  @Input() onBlur: (fieldId: string) => void = () => {};

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly chipInputText = signal<Record<string, string>>({});

  private get formGroup(): FormGroup {
    return this.controlContainer.control as FormGroup;
  }

  get currentFormGroup(): FormGroup {
    return this.formGroup;
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
    const control = this.formGroup.get(fieldId);
    if (!control) return;
    const current: string[] = (control.value ?? []) as string[];
    if (!current.includes(event.option.value as string)) {
      control.setValue([...current, event.option.value as string]);
      control.markAsDirty();
    }
    inputEl.value = '';
    this.chipInputText.update(map => ({ ...map, [fieldId]: '' }));

    // MatAutocompleteTrigger._setValueAndClose() calls closePanel() synchronously
    // after emitting optionSelected. closePanel() detaches the overlay and calls
    // detectChanges(), which commits the closed state to the DOM before any
    // microtask can reopen it — producing a visible flash.
    //
    // Fix: temporarily replace closePanel with a no-op so the overlay is never
    // detached. In the queued microtask, restore the real closePanel and renew
    // _closingActionsSubscription (consumed by take(1) on selection) so that
    // outside-click / Escape / Tab still correctly close the panel.
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

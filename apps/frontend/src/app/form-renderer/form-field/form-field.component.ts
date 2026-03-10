import { Component, Input, inject, input, signal, Signal, WritableSignal } from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { FieldDto } from '@formrig/shared';
import { FileUploadEntry } from '../file-upload-entry.model';
import { TextFieldComponent } from './fields/text-field/text-field.component';
import { TextareaFieldComponent } from './fields/textarea-field/textarea-field.component';
import { SelectFieldComponent } from './fields/select-field/select-field.component';
import { MultiSelectFieldComponent } from './fields/multi-select-field/multi-select-field.component';
import { RadioFieldComponent } from './fields/radio-field/radio-field.component';
import { CheckboxFieldComponent } from './fields/checkbox-field/checkbox-field.component';
import { FileUploadFieldComponent } from './fields/file-upload-field/file-upload-field.component';
import { DatePickerFieldComponent } from './fields/date-picker-field/date-picker-field.component';
import { NumberFieldComponent } from './fields/number-field/number-field.component';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [
    TextFieldComponent,
    TextareaFieldComponent,
    SelectFieldComponent,
    MultiSelectFieldComponent,
    RadioFieldComponent,
    CheckboxFieldComponent,
    FileUploadFieldComponent,
    DatePickerFieldComponent,
    NumberFieldComponent,
  ],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
})
export class FormFieldComponent {
  readonly field = input.required<FieldDto>();
  readonly readonly = input<boolean>(false);

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
}

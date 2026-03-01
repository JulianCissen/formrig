import { Component, Input, inject, input, Signal, WritableSignal } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
    MatProgressBarModule,
    ReactiveFormsModule,
  ],
  templateUrl: './form-field.component.html',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer) }],
})
export class FormFieldComponent {
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
}

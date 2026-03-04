import { Component, Input, signal, Signal, WritableSignal, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FieldDto } from '@formrig/shared';
import { FileUploadEntry } from '../../file-upload-entry.model';
import { FieldPlainWrapperComponent } from '../wrappers/field-plain-wrapper.component';

@Component({
  selector: 'app-file-upload-field',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    FieldPlainWrapperComponent,
  ],
  templateUrl: './file-upload-field.component.html',
  styleUrl: './file-upload-field.component.scss',
})
export class FileUploadFieldComponent {
  readonly field = input.required<Extract<FieldDto, { type: 'file-upload' }>>();

  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());

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

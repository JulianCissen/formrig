import { Component, OnInit, Output, EventEmitter, inject, signal, WritableSignal } from '@angular/core';
import { A11yModule, LiveAnnouncer } from '@angular/cdk/a11y';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { FormDefinitionDto, FormDefinitionDtoSchema } from '../models/field.model';

@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [A11yModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatButtonModule, MatRadioModule, MatCheckboxModule, MatSelectModule, MatAutocompleteModule, MatIconModule],
  templateUrl: './form-renderer.component.html',
  styleUrl: './form-renderer.component.scss',
  host: { style: 'display:block; padding:2rem; max-width:480px; margin:0 auto; width:100%' }
})
export class FormRendererComponent implements OnInit {
  private http = inject(HttpClient);
  private liveAnnouncer = inject(LiveAnnouncer);

  @Output() readonly titleLoaded = new EventEmitter<string>();

  formDef = signal<FormDefinitionDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  dragOverFieldId: WritableSignal<string | null> = signal<string | null>(null);
  selectedFiles = new Map<string, File[]>();

  onDragOver(event: DragEvent, fieldId: string): void {
    event.preventDefault();
    this.dragOverFieldId.set(fieldId);
  }

  onDragLeave(event: DragEvent, fieldId: string): void {
    // Guard against child element flickering
    if (event.relatedTarget && (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      return;
    }
    if (this.dragOverFieldId() === fieldId) {
      this.dragOverFieldId.set(null);
    }
  }

  onDrop(event: DragEvent, fieldId: string): void {
    event.preventDefault();
    this.dragOverFieldId.set(null);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFiles.set(fieldId, Array.from(files));
    }
  }

  onFileChange(event: Event, fieldId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFiles.set(fieldId, Array.from(input.files));
    }
  }

  ngOnInit(): void {
    this.http.get<unknown>('/api/form/active').subscribe({
      next: (raw) => {
        const result = FormDefinitionDtoSchema.safeParse(raw);
        if (!result.success) {
          this.error.set('Unexpected response from server.');
          this.loading.set(false);
          return;
        }
        this.formDef.set(result.data);
        this.titleLoaded.emit(result.data.title ?? 'Form');
        this.loading.set(false);
        void this.liveAnnouncer.announce(
          result.data.title ? 'Form loaded: ' + result.data.title : 'Form loaded.',
          'polite'
        );
      },
      error: (_err) => {
        this.error.set('Could not load the form. Please try again later.');
        this.loading.set(false);
      }
    });
  }
}

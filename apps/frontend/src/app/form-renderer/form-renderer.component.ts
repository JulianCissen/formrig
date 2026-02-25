import { Component, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { A11yModule, LiveAnnouncer } from '@angular/cdk/a11y';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormDefinitionDto, FormDefinitionDtoSchema } from '../models/field.model';

@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [A11yModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
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

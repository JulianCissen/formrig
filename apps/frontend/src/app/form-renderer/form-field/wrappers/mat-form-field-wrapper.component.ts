import { Component, Input, signal, Signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-mat-form-field-wrapper',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './mat-form-field-wrapper.component.html',
  styleUrl: './mat-form-field-wrapper.component.scss',
})
export class MatFormFieldWrapperComponent {
  @Input({ required: true }) fieldId!: string;
  @Input({ required: true }) label!: string;
  @Input() hint?: string;
  @Input() info?: string;
  @Input({ required: true }) required!: boolean;
  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
}

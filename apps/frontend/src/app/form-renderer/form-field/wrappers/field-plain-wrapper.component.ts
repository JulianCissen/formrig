import { Component, Input, signal, Signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-field-plain-wrapper',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './field-plain-wrapper.component.html',
  styleUrl: './field-plain-wrapper.component.scss',
})
export class FieldPlainWrapperComponent {
  @Input({ required: true }) fieldId!: string;
  @Input({ required: true }) label!: string;
  @Input() hint?: string;
  @Input() info?: string;
  @Input() dirtyFieldIds: Signal<Set<string>> = signal(new Set<string>());
  @Input() validationState: Signal<Map<string, string[]>> = signal(new Map<string, string[]>());
}

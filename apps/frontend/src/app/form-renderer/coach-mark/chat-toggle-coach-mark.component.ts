import { Component, input, output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat-toggle-coach-mark',
  standalone: true,
  imports: [A11yModule, MatButtonModule, MatIconModule],
  templateUrl: './chat-toggle-coach-mark.component.html',
  styleUrl: './chat-toggle-coach-mark.component.scss',
})
export class ChatToggleCoachMarkComponent {
  readonly chatMode = input<boolean>(false);
  readonly dismissed = output<void>();

  protected dismiss(): void {
    this.dismissed.emit();
  }
}

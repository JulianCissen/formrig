import { Component, ElementRef, ViewChild, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-form-chat',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './form-chat.component.html',
  styleUrl: './form-chat.component.scss',
})
export class FormChatComponent {
  // Reserved — unused internally; provided for future lazy-init guard.
  readonly active = input<boolean>(false);

  readonly messageText = signal<string>('');

  @ViewChild('chatInputEl') chatInputEl!: ElementRef<HTMLInputElement>;

  sendMessage(): void {
    if (!this.messageText()) return;
    this.messageText.set('');
    // TODO(ai-integration):
    // 1. Append user message to a messages signal: this.messages.update(m => [...m, { role: 'user', text }])
    // 2. Call an injected AI chat service: this.chatService.send(this.formId, text)
    // 3. Push the streamed/resolved reply: this.messages.update(m => [...m, { role: 'assistant', text: reply }])
    //    SECURITY: render reply via {{ }} text interpolation only — never [innerHTML] without DomSanitizer sanitization
    // 4. Handle loading state and error state signals during the request
    this.chatInputEl.nativeElement.focus();
  }

  focus(): void {
    this.chatInputEl.nativeElement.focus();
  }
}

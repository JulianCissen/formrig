import {
  Component,
  ElementRef,
  Injector,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { marked } from 'marked';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormChatService } from '../../services/form-chat.service';
import { ChatMessage } from '../../models/form-chat.model';

@Component({
  selector: 'app-form-chat',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './form-chat.component.html',
  styleUrl: './form-chat.component.scss',
})
export class FormChatComponent {
  // Reserved — unused internally; provided for parent compatibility.
  readonly active = input<boolean>(false);

  readonly formId = input<string>('');

  readonly valuesUpdated = output<Record<string, unknown>>();

  readonly messageText = signal<string>('');
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal<boolean>(false);
  readonly completed = signal<boolean>(false);
  readonly loadFailed = signal<boolean>(false);

  private _conversationLoaded = false;

  @ViewChild('chatInputEl') chatInputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('chatLog') chatLogEl!: ElementRef<HTMLElement>;

  private readonly _chatService = inject(FormChatService);
  private readonly _injector = inject(Injector);

  constructor() {
    effect(() => {
      this.messages(); // reactive read for dependency tracking
      afterNextRender(
        () => {
          const el = this.chatLogEl?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        },
        { injector: this._injector }
      );
    });

    effect(() => {
      if (this.formId() && !this._conversationLoaded) {
        this.loadConversation();
      }
    });

    let _previousActive = false;
    effect(() => {
      const current = this.active();
      if (current && !_previousActive && this._conversationLoaded && !this.completed()) {
        this._doSync();
      }
      _previousActive = current;
    });
  }

  private loadConversation(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this._chatService.getConversation(this.formId()).subscribe({
      next: (conv) => {
        this.messages.set(conv.messages as ChatMessage[]);
        this._conversationLoaded = true;
        if (conv.status === 'COMPLETED') {
          this.completed.set(true);
        }
        if (conv.syncRequired) {
          this._doSync();
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  private _doSync(): void {
    this.loading.set(true);
    this._chatService.postSync(this.formId()).subscribe({
      next: (res) => {
        for (const msg of res.messages) {
          this.messages.update(m => [...m, { role: 'assistant', content: msg }]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  retryLoad(): void {
    this.loadFailed.set(false);
    this.loadConversation();
  }

  sendMessage(): void {
    const text = this.messageText().trim();
    if (!text || this.loading() || this.completed()) return;
    this.messageText.set('');
    this.messages.update(m => [...m, { role: 'user', content: text }]);
    this.loading.set(true);
    this._chatService.sendChatMessage(this.formId(), text).subscribe({
      next: (res) => {
        this.loading.set(false);
        for (const msg of res.messages) {
          this.messages.update(m => [...m, { role: 'assistant', content: msg }]);
        }
        this.valuesUpdated.emit(res.updatedValues);
        if (res.status === 'COMPLETED') {
          this.completed.set(true);
        } else {
          this.chatInputEl.nativeElement.focus();
        }
      },
      error: (_err: HttpErrorResponse) => {
        this.loading.set(false);
        this.messages.update(m => [...m, { role: 'error', content: 'Something went wrong. Please try again.' }]);
        this.chatInputEl.nativeElement.focus();
      },
    });
  }

  focus(): void {
    this.chatInputEl.nativeElement.focus();
  }

  renderMarkdown(text: string): string {
    const result = marked.parse(text, { async: false });
    return typeof result === 'string' ? result : '';
  }
}



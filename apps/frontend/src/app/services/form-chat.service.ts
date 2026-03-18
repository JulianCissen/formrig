import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatTurnResponse, GetChatConversationResponse, SyncResponse } from '../models/form-chat.model';

@Injectable({ providedIn: 'root' })
export class FormChatService {
  private readonly http = inject(HttpClient);

  sendChatMessage(formId: string, message: string): Observable<ChatTurnResponse> {
    return this.http.post<ChatTurnResponse>(
      `/api/forms/${encodeURIComponent(formId)}/chat`,
      { message }
    );
  }

  getConversation(formId: string): Observable<GetChatConversationResponse> {
    return this.http.get<GetChatConversationResponse>(`/api/forms/${encodeURIComponent(formId)}/chat`);
  }

  postSync(formId: string): Observable<SyncResponse> {
    return this.http.post<SyncResponse>(`/api/forms/${encodeURIComponent(formId)}/chat/sync`, {});
  }
}

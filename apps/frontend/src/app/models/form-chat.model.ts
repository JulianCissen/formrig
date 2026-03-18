export interface ChatTurnResponse {
  messages:       string[];
  currentFieldId: string | null;
  updatedValues:  Record<string, unknown>;
  status:         'COLLECTING' | 'COMPLETED';
}

export interface SyncResponse {
  messages: string[];
}

export interface ChatMessage {
  role:    'user' | 'assistant' | 'error';
  content: string;
}

export interface ConversationMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface GetChatConversationResponse {
  messages: ConversationMessageDto[];
  currentFieldId: string | null;
  status: 'NOT_STARTED' | 'COLLECTING' | 'COMPLETED';
  syncRequired: boolean;
}

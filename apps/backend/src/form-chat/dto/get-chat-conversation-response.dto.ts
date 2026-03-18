export interface ConversationMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface GetChatConversationResponseDto {
  messages: ConversationMessageDto[];
  currentFieldId: string | null;
  status: 'NOT_STARTED' | 'COLLECTING' | 'COMPLETED';
  syncRequired: boolean;
}

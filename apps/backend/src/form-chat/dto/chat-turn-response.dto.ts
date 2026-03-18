export class ChatTurnResponseDto {
  messages!: string[];
  currentFieldId!: string | null;
  updatedValues!: Record<string, unknown>;
  status!: 'COLLECTING' | 'COMPLETED';
}

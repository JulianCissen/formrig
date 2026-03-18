import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { FieldDto } from '@formrig/shared';
import { LlmService, LlmMessage } from './llm.service';
import { FormChatPrompt } from './entities/form-chat-prompt.entity';
import { buildExtractionSchema } from './utils/rule-to-json-schema.util';
import { renderTemplate } from './utils/render-template.util';
import { PROMPT_DEFAULTS } from './utils/prompt-defaults';
import { CONTEXT_WINDOW_SIZE } from './constants';

export type IntentType =
  | 'ANSWER'
  | 'ANSWER_OTHER_FIELD'
  | 'CLARIFICATION_QUESTION'
  | 'GIBBERISH'
  | 'OFF_TOPIC'
  | 'CORRECTION'
  | 'SKIP_REQUEST';

export interface IntentClassificationResult {
  intent: IntentType;
  targetFieldId?: string;
}

const INTENT_CLASSIFICATION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'ANSWER',
        'ANSWER_OTHER_FIELD',
        'CLARIFICATION_QUESTION',
        'GIBBERISH',
        'OFF_TOPIC',
        'CORRECTION',
        'SKIP_REQUEST',
      ],
    },
    targetFieldId: { type: 'string' },
  },
  required: ['intent'],
};

const FILE_ASSOCIATION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    targetFieldId: { type: ['string', 'null'] },
    confidence: { type: 'string', enum: ['high', 'low'] },
  },
  required: ['targetFieldId', 'confidence'],
};

@Injectable()
export class NluService {
  constructor(
    @InjectRepository(FormChatPrompt)
    private readonly promptRepo: EntityRepository<FormChatPrompt>,
    private readonly llmService: LlmService,
  ) {}

  private async loadPrompt(key: string): Promise<{ template: string; contextWindowSize: number | null }> {
    const record = await this.promptRepo.findOne({ key });
    return {
      template: record?.template ?? PROMPT_DEFAULTS[key] ?? '',
      contextWindowSize: record?.contextWindowSize ?? null,
    };
  }

  /**
   * Classifies the intent of a user message for the current form slot.
   * FILE_UPLOAD is never returned — it is classified by the backend before this call.
   */
  async classifyIntent(
    userMessage: string,
    currentField: { id: string; label: string },
    visibleFields: Array<{ id: string; label: string }>,
    messages: LlmMessage[],
  ): Promise<IntentClassificationResult> {
    const prompt = await this.loadPrompt('nlu.intent_classification');
    const effectiveWindowSize = prompt.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const fieldList = visibleFields.map((f) => `${f.id}: ${f.label}`).join('; ');
    const systemContent = renderTemplate(prompt.template, {
      fieldLabel: currentField.label,
      message: userMessage,
      visibleFields: fieldList,
    });

    const windowed = messages.slice(-effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: systemContent },
      ...windowed,
      { role: 'user', content: userMessage },
    ];

    return this.llmService.chatStructured<IntentClassificationResult>(
      INTENT_CLASSIFICATION_SCHEMA,
      llmMessages,
    );
  }

  /**
   * Extracts a typed value for the given field from the user's message.
   * Returns null if the field is a file-upload type or if the LLM cannot extract a value.
   */
  async extractValue(
    userMessage: string,
    fieldDto: FieldDto,
    collectedValues: Record<string, unknown>,
    messages: LlmMessage[],
  ): Promise<unknown> {
    const schema = buildExtractionSchema(fieldDto, collectedValues);
    if (schema === null) return null;

    const prompt = await this.loadPrompt('nlu.value_extraction');
    const effectiveWindowSize = prompt.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const systemContent = renderTemplate(prompt.template, {
      fieldLabel: fieldDto.label,
      message: userMessage,
    });

    const windowed = messages.slice(-effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: systemContent },
      ...windowed,
      { role: 'user', content: userMessage },
    ];

    const result = await this.llmService.chatStructured<{ value: unknown }>(schema, llmMessages);
    return result?.value ?? null;
  }

  /**
   * Identifies which visible file-upload field the provided attachment files belong to.
   * Bypasses the LLM call entirely if no visible file-upload fields exist.
   */
  async identifyFileUploadTarget(
    attachmentFileIds: string[],
    visibleFileUploadFields: Array<{ id: string; label: string }>,
    userMessage: string,
    messages: LlmMessage[],
  ): Promise<{ targetFieldId: string | null; confidence: 'high' | 'low' }> {
    if (visibleFileUploadFields.length === 0) {
      return { targetFieldId: null, confidence: 'low' };
    }

    const prompt = await this.loadPrompt('nlu.file_association');
    const effectiveWindowSize = prompt.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const fieldList = visibleFileUploadFields.map((f) => `${f.id}: ${f.label}`).join('; ');
    const systemContent = renderTemplate(prompt.template, {
      fields: fieldList,
    });

    const turnContent = userMessage || `Attaching ${attachmentFileIds.length} file(s).`;
    const windowed = messages.slice(-effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: systemContent },
      ...windowed,
      { role: 'user', content: turnContent },
    ];

    return this.llmService.chatStructured<{ targetFieldId: string | null; confidence: 'high' | 'low' }>(
      FILE_ASSOCIATION_SCHEMA,
      llmMessages,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { FieldDto } from '@formrig/shared';
import { LlmService, LlmMessage } from './llm.service';
import { FormChatPrompt } from './entities/form-chat-prompt.entity';
import { renderTemplate } from './utils/render-template.util';
import { PROMPT_DEFAULTS } from './utils/prompt-defaults';
import { CONTEXT_WINDOW_SIZE, COMPACTION_THRESHOLD } from './constants';

@Injectable()
export class NlgService {
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

  private async prepareContextWindow(
    messages: LlmMessage[],
    windowSize: number,
    promptKey = 'nlg.context_compaction',
  ): Promise<LlmMessage[]> {
    if (messages.length >= COMPACTION_THRESHOLD) {
      const compactionPrompt = await this.loadPrompt(promptKey);
      const summaryText = await this.llmService.chat([
        { role: 'system', content: compactionPrompt.template },
        ...messages,
      ]);
      const summaryMsg: LlmMessage = { role: 'assistant', content: summaryText, isSummary: true };
      return [summaryMsg, ...messages.slice(-windowSize)];
    }
    // Phase 1: sliding window with pinned first exchange
    if (messages.length <= windowSize) return messages;
    const tailStartIndex = messages.length - windowSize;
    const pinned = messages.slice(0, 2).filter((_, i) => i < tailStartIndex);
    const tail = messages.slice(-windowSize);
    return [...pinned, ...tail];
  }

  private async buildSystemContent(
    taskKey: string,
    vars: Record<string, string>,
  ): Promise<{ content: string; contextWindowSize: number | null }> {
    const [personaPrompt, taskPrompt] = await Promise.all([
      this.loadPrompt('system.persona'),
      this.loadPrompt(taskKey),
    ]);
    const taskContent = renderTemplate(taskPrompt.template, vars);
    const content = personaPrompt.template
      ? `${personaPrompt.template}\n\n${taskContent}`
      : taskContent;
    return { content, contextWindowSize: taskPrompt.contextWindowSize };
  }

  async firstAsk(field: FieldDto, formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.first_ask', {
      fieldLabel: field.label,
      fieldType: field.type,
      formName,
      required: String(field.required),
      hint: field.hint ?? '',
      info: field.info ?? '',
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async nextAsk(field: FieldDto, formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.next_ask', {
      fieldLabel: field.label,
      fieldType: field.type,
      formName,
      required: String(field.required),
      hint: field.hint ?? '',
      info: field.info ?? '',
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async stateChange(newField: FieldDto, formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.state_change', {
      fieldLabel: newField.label,
      fieldType: newField.type,
      formName,
      required: String(newField.required),
      hint: newField.hint ?? '',
      info: newField.info ?? '',
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async validationErrorReprompt(field: FieldDto, errors: string[], formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.validation_error', {
      fieldLabel: field.label,
      errors: errors.join('; '),
      formName,
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async clarificationAnswer(userQuestion: string, field: FieldDto, formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.clarification', {
      fieldLabel: field.label,
      userQuestion,
      formName,
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async skipAcknowledgement(field: FieldDto, isRequired: boolean, formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.skip_ack', {
      fieldLabel: field.label,
      willReask: isRequired ? ' It will be asked again later.' : '',
      formName,
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async formComplete(formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.form_complete', { formName });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async fileUploadReminder(
    field: FieldDto | null,
    formName: string,
    messages: LlmMessage[],
    ambiguousFields?: Array<{ label: string }>,
  ): Promise<string> {
    const system = await this.buildSystemContent('nlg.file_upload_reminder', {
      fieldLabel: field?.label ?? '',
      formName,
      fieldList: ambiguousFields?.map((f) => f.label).join(', ') ?? '',
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async answerOtherFieldConfirmed(
    targetField: FieldDto,
    value: unknown,
    currentField: FieldDto,
    formName: string,
    messages: LlmMessage[],
  ): Promise<string> {
    const system = await this.buildSystemContent('nlg.answer_other_field_confirmed', {
      targetFieldLabel: targetField.label,
      value: String(value),
      currentFieldLabel: currentField.label,
      formName,
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async correctionConfirmed(
    targetField: FieldDto,
    newValue: unknown,
    currentField: FieldDto,
    formName: string,
    messages: LlmMessage[],
  ): Promise<string> {
    const system = await this.buildSystemContent('nlg.correction_confirmed', {
      targetFieldLabel: targetField.label,
      newValue: String(newValue),
      currentFieldLabel: currentField.label,
      formName,
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async gibberishReply(field: FieldDto, formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.gibberish_reply', {
      fieldLabel: field.label,
      formName,
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async offTopicReply(field: FieldDto, formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.off_topic_reply', {
      fieldLabel: field.label,
      formName,
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async cyclingReask(field: FieldDto, formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.cycling_reask', {
      fieldLabel: field.label,
      formName,
    });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }

  async welcome(formName: string, messages: LlmMessage[]): Promise<string> {
    const system = await this.buildSystemContent('nlg.welcome', { formName });
    const effectiveWindowSize = system.contextWindowSize ?? CONTEXT_WINDOW_SIZE;
    const windowed = await this.prepareContextWindow(messages, effectiveWindowSize);
    const llmMessages: LlmMessage[] = [
      { role: 'system', content: system.content },
      ...windowed,
    ];
    return this.llmService.chat(llmMessages);
  }
}

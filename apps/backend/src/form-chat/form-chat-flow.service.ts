import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { FieldDto, getEffectiveRules, evaluateRuntimeConditionTree, BaseField } from '@formrig/shared';
import { NluService, IntentType } from './nlu.service';
import { NlgService } from './nlg.service';
import { LlmMessage } from './llm.service';
import { FormChatStateMachine, SlotResult } from './form-chat-state-machine';
import { FormConversationService } from './form-conversation.service';
import { FormConversation } from './entities/form-conversation.entity';
import { Form } from '../form/entities/form.entity';
import { ChatTurnRequestDto } from './dto/chat-turn-request.dto';
import { ChatTurnResponseDto } from './dto/chat-turn-response.dto';
import { hardValidate } from '../form/hard-validate.util';
import { isArrayField } from './utils/rule-to-json-schema.util';

@Injectable()
export class FormChatFlowService {
  private readonly stateMachine = new FormChatStateMachine();

  constructor(
    private readonly nluService: NluService,
    private readonly nlgService: NlgService,
    private readonly conversationService: FormConversationService,
    private readonly em: EntityManager,
  ) {}

  async processTurn(
    conversation: FormConversation,
    form: Form,
    allFields: FieldDto[],
    currentField: FieldDto | null,
    dto: ChatTurnRequestDto,
    formName: string,
  ): Promise<ChatTurnResponseDto> {
    // Step 1: Append user message
    conversation.messages = [
      ...conversation.messages,
      { role: 'user', content: dto.message ?? '', timestamp: new Date().toISOString() },
    ];

    const historyMessages = this.toLlmMessages(conversation.messages.slice(0, -1));
    const updatedValuesThisTurn: Record<string, unknown> = {};
    let skippedFieldIds = [...conversation.skippedFieldIds];

    // Special case: no current field means form is already complete
    if (currentField === null) {
      const reply = await this.nlgService.formComplete(formName, historyMessages);
      conversation.messages = [
        ...conversation.messages,
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ];
      conversation.status = 'COMPLETED';
      conversation.currentFieldId = null;
      conversation.skippedFieldIds = skippedFieldIds;
      await this.conversationService.save(conversation);
      return { messages: [reply], currentFieldId: null, updatedValues: updatedValuesThisTurn, status: 'COMPLETED' };
    }

    // Step 2: Determine intent
    let intent: IntentType | 'FILE_UPLOAD';
    let targetFieldIdFromClassification: string | undefined;

    if (dto.attachmentFileIds && dto.attachmentFileIds.length > 0) {
      intent = 'FILE_UPLOAD';
    } else {
      const visibleFields = allFields.filter((f) => this.isVisible(f, form.values));
      const result = await this.nluService.classifyIntent(
        dto.message!,
        currentField,
        visibleFields.map((f) => ({ id: f.id, label: f.label })),
        historyMessages,
      );
      intent = result.intent;
      targetFieldIdFromClassification = result.targetFieldId;
    }

    // Step 3: Branch on intent
    const visibleFieldsForResolve = allFields.filter((f) => this.isVisible(f, form.values));
    let reply: string;
    let currentFieldId: string | null = currentField.id;
    let resultStatus: 'COLLECTING' | 'COMPLETED' = 'COLLECTING';

    switch (intent) {
      case 'ANSWER': {
        // ── ARRAY FIELD PATH ──────────────────────────────────────────────
        if (isArrayField(currentField)) {
          const existingArray: string[] =
            Array.isArray(form.values[currentField.id])
              ? (form.values[currentField.id] as string[])
              : [];

          const extractedItem = await this.nluService.extractValue(
            dto.message!,
            currentField,
            form.values,
            historyMessages,
            true,
          );

          if (extractedItem === null) {
            reply = await this.nlgService.gibberishReply(currentField, formName, historyMessages);
          } else {
            const newArray = [...existingArray, extractedItem as string];
            form.values = { ...form.values, [currentField.id]: newArray };
            form.unconfirmedFieldIds = form.unconfirmedFieldIds.filter(
              (id) => id !== currentField!.id,
            );
            updatedValuesThisTurn[currentField.id] = newArray;
            this.em.persist(form);
            reply = await this.nlgService.arrayAccumulationAskMore(
              currentField,
              extractedItem as string,
              formName,
              historyMessages,
            );
          }
          break;
        }

        // ── SCALAR FIELD PATH ─────────────────────────────────────────────
        const extractedValue = await this.nluService.extractValue(
          dto.message!,
          currentField,
          form.values,
          historyMessages,
        );
        if (extractedValue === null) {
          reply = await this.nlgService.gibberishReply(currentField, formName, historyMessages);
        } else {
          const errors = this.validate(currentField, extractedValue, form.values);
          if (errors.length > 0) {
            reply = await this.nlgService.validationErrorReprompt(currentField, errors, formName, historyMessages);
          } else {
            form.values = { ...form.values, [currentField.id]: extractedValue };
            form.unconfirmedFieldIds = form.unconfirmedFieldIds.filter((id) => id !== currentField!.id);
            updatedValuesThisTurn[currentField.id] = extractedValue;
            this.em.persist(form);
            const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
              skippedFieldIds,
              unconfirmedFieldIds: form.unconfirmedFieldIds,
            });
            const resolved = await this.resolveSlotResult(slotResult, formName, historyMessages, conversation, skippedFieldIds);
            reply = resolved.reply;
            currentFieldId = resolved.currentFieldId;
            resultStatus = resolved.status;
          }
        }
        break;
      }

      case 'ANSWER_OTHER_FIELD': {
        const targetField = this.resolveTargetField(targetFieldIdFromClassification, visibleFieldsForResolve);
        if (targetField === null) {
          // Downgrade to ANSWER
          const extractedValue = await this.nluService.extractValue(
            dto.message!,
            currentField,
            form.values,
            historyMessages,
          );
          if (extractedValue === null) {
            reply = await this.nlgService.gibberishReply(currentField, formName, historyMessages);
          } else {
            const errors = this.validate(currentField, extractedValue, form.values);
            if (errors.length > 0) {
              reply = await this.nlgService.validationErrorReprompt(currentField, errors, formName, historyMessages);
            } else {
              form.values = { ...form.values, [currentField.id]: extractedValue };
              form.unconfirmedFieldIds = form.unconfirmedFieldIds.filter((id) => id !== currentField!.id);
              updatedValuesThisTurn[currentField.id] = extractedValue;
              this.em.persist(form);
              const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
                skippedFieldIds,
                unconfirmedFieldIds: form.unconfirmedFieldIds,
              });
              const resolved = await this.resolveSlotResult(slotResult, formName, historyMessages, conversation, skippedFieldIds);
              reply = resolved.reply;
              currentFieldId = resolved.currentFieldId;
              resultStatus = resolved.status;
            }
          }
        } else {
          const extractedValue = await this.nluService.extractValue(
            dto.message!,
            targetField,
            form.values,
            historyMessages,
          );
          const errors = extractedValue === null ? [] : this.validate(targetField, extractedValue, form.values);
          if (extractedValue === null || errors.length > 0) {
            reply = await this.nlgService.firstAsk(currentField, formName, historyMessages);
          } else {
            form.values = { ...form.values, [targetField.id]: extractedValue };
            form.unconfirmedFieldIds = form.unconfirmedFieldIds.filter((id) => id !== targetField.id);
            updatedValuesThisTurn[targetField.id] = extractedValue;
            this.em.persist(form);
            reply = await this.nlgService.answerOtherFieldConfirmed(
              targetField,
              extractedValue,
              currentField,
              formName,
              historyMessages,
            );
          }
        }
        break;
      }

      case 'CLARIFICATION_QUESTION': {
        reply = await this.nlgService.clarificationAnswer(dto.message!, currentField, formName, historyMessages);
        break;
      }

      case 'GIBBERISH': {
        reply = await this.nlgService.gibberishReply(currentField, formName, historyMessages);
        break;
      }

      case 'OFF_TOPIC': {
        reply = await this.nlgService.offTopicReply(currentField, formName, historyMessages);
        break;
      }

      case 'CORRECTION': {
        const targetField = this.resolveTargetField(targetFieldIdFromClassification, visibleFieldsForResolve);
        const hasExistingValue =
          targetField !== null &&
          form.values[targetField.id] !== undefined &&
          form.values[targetField.id] !== null;

        if (!hasExistingValue) {
          // Downgrade: target absent or not yet answered.
          // If target is identified (not null), treat as ANSWER_OTHER_FIELD (attempt extraction for target).
          // If target could not be identified (null), treat as ANSWER (attempt extraction for current field).
          const fieldToExtract = targetField ?? currentField;
          const downgradeExtracted = await this.nluService.extractValue(
            dto.message!,
            fieldToExtract,
            form.values,
            historyMessages,
          );
          const downgradeErrors =
            downgradeExtracted === null ? [] : this.validate(fieldToExtract, downgradeExtracted, form.values);
          if (downgradeExtracted === null || downgradeErrors.length > 0) {
            if (downgradeErrors.length > 0) {
              reply = await this.nlgService.validationErrorReprompt(
                fieldToExtract,
                downgradeErrors,
                formName,
                historyMessages,
              );
            } else {
              reply = await this.nlgService.firstAsk(currentField, formName, historyMessages);
            }
          } else {
            form.values = { ...form.values, [fieldToExtract.id]: downgradeExtracted };
            form.unconfirmedFieldIds = form.unconfirmedFieldIds.filter((id) => id !== fieldToExtract.id);
            updatedValuesThisTurn[fieldToExtract.id] = downgradeExtracted;
            this.em.persist(form);
            if (targetField !== null) {
              // ANSWER_OTHER_FIELD: confirmed answer for a different (unanswered) field; cursor stays on current
              reply = await this.nlgService.answerOtherFieldConfirmed(
                fieldToExtract,
                downgradeExtracted,
                currentField,
                formName,
                historyMessages,
              );
            } else {
              // ANSWER: extracted value is for current field — advance cursor
              const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
                skippedFieldIds,
                unconfirmedFieldIds: form.unconfirmedFieldIds,
              });
              const resolved = await this.resolveSlotResult(
                slotResult,
                formName,
                historyMessages,
                conversation,
                skippedFieldIds,
              );
              reply = resolved.reply;
              currentFieldId = resolved.currentFieldId;
              resultStatus = resolved.status;
            }
          }
        } else {
          const extractedValue = await this.nluService.extractValue(
            dto.message!,
            targetField!,
            form.values,
            historyMessages,
          );
          const errors = extractedValue === null ? [] : this.validate(targetField!, extractedValue, form.values);
          if (extractedValue === null || errors.length > 0) {
            if (errors.length > 0) {
              const validationMsg = await this.nlgService.validationErrorReprompt(
                targetField!,
                errors,
                formName,
                historyMessages,
              );
              const reaskMsg = await this.nlgService.firstAsk(currentField, formName, historyMessages);
              reply = `${validationMsg}\n\n${reaskMsg}`;
            } else {
              reply = await this.nlgService.firstAsk(currentField, formName, historyMessages);
            }
          } else {
            form.values = { ...form.values, [targetField!.id]: extractedValue };
            form.unconfirmedFieldIds = form.unconfirmedFieldIds.filter((id) => id !== targetField!.id);
            updatedValuesThisTurn[targetField!.id] = extractedValue;
            this.em.persist(form);
            skippedFieldIds = skippedFieldIds.filter((id) => id !== targetField!.id);
            const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
              skippedFieldIds,
              unconfirmedFieldIds: form.unconfirmedFieldIds,
            });
            const confirmMsg = await this.nlgService.correctionConfirmed(
              targetField!,
              extractedValue,
              currentField,
              formName,
              historyMessages,
            );
            const resolved = await this.resolveSlotResult(slotResult, formName, historyMessages, conversation, skippedFieldIds);
            reply = `${confirmMsg}\n\n${resolved.reply}`;
            currentFieldId = resolved.currentFieldId;
            resultStatus = resolved.status;
          }
        }
        break;
      }

      case 'ARRAY_DONE': {
        if (!isArrayField(currentField)) {
          reply = await this.nlgService.gibberishReply(currentField, formName, historyMessages);
          break;
        }

        const existingArray: string[] =
          Array.isArray(form.values[currentField.id])
            ? (form.values[currentField.id] as string[])
            : [];

        if (existingArray.length === 0) {
          // No values collected yet — treat as skip
          skippedFieldIds = [...skippedFieldIds, currentField.id];
          const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
            skippedFieldIds,
            unconfirmedFieldIds: form.unconfirmedFieldIds,
          });
          const skipMsg = await this.nlgService.skipAcknowledgement(
            currentField, currentField.required, formName, historyMessages,
          );
          const resolved = await this.resolveSlotResult(
            slotResult, formName, historyMessages, conversation, skippedFieldIds,
          );
          reply = `${skipMsg}\n\n${resolved.reply}`;
          currentFieldId = resolved.currentFieldId;
          resultStatus = resolved.status;
        } else {
          const arrayErrors = this.validate(currentField, existingArray, form.values);
          if (arrayErrors.length > 0) {
            reply = await this.nlgService.validationErrorReprompt(
              currentField, arrayErrors, formName, historyMessages,
            );
          } else {
            const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
              skippedFieldIds,
              unconfirmedFieldIds: form.unconfirmedFieldIds,
            });
            const doneMsg = await this.nlgService.arrayAccumulationDone(
              currentField, existingArray, formName, historyMessages,
            );
            const resolved = await this.resolveSlotResult(
              slotResult, formName, historyMessages, conversation, skippedFieldIds,
            );
            reply = `${doneMsg}\n\n${resolved.reply}`;
            currentFieldId = resolved.currentFieldId;
            resultStatus = resolved.status;
          }
        }
        break;
      }

      case 'SKIP_REQUEST': {
        // Always add to skippedFieldIds so PASS 1 advances past it.
        // Required fields are re-asked via PASS 2; optional ones are not (required=false).
        skippedFieldIds = [...skippedFieldIds, currentField.id];
        const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
          skippedFieldIds,
          unconfirmedFieldIds: form.unconfirmedFieldIds,
        });
        const skipMsg = await this.nlgService.skipAcknowledgement(currentField, currentField.required, formName, historyMessages);
        const resolved = await this.resolveSlotResult(slotResult, formName, historyMessages, conversation, skippedFieldIds);
        reply = `${skipMsg}\n\n${resolved.reply}`;
        currentFieldId = resolved.currentFieldId;
        resultStatus = resolved.status;
        break;
      }

      case 'FILE_UPLOAD': {
        const visibleFileUploadFields = allFields.filter(
          (f) => f.type === 'file-upload' && this.isVisible(f, form.values),
        );

        if (visibleFileUploadFields.length === 0) {
          // Outcome A: no file-upload fields visible — discard attachments
          reply = await this.nlgService.fileUploadReminder(null, formName, historyMessages);
          break;
        }

        const fileAssocResult = await this.nluService.identifyFileUploadTarget(
          dto.attachmentFileIds!,
          visibleFileUploadFields.map((f) => ({ id: f.id, label: f.label })),
          dto.message ?? '',
          historyMessages,
        );

        if (fileAssocResult.confidence === 'low' || fileAssocResult.targetFieldId === null) {
          // Outcome B: ambiguous — ask user to clarify
          reply = await this.nlgService.fileUploadReminder(
            null,
            formName,
            historyMessages,
            visibleFileUploadFields,
          );
          break;
        }

        // Outcome C: high confidence — resolve field and write values
        const targetField = this.resolveTargetField(fileAssocResult.targetFieldId as string, visibleFileUploadFields);
        if (targetField === null) {
          // LLM returned a hallucinated field ID — fall back to ambiguous
          reply = await this.nlgService.fileUploadReminder(
            null,
            formName,
            historyMessages,
            visibleFileUploadFields,
          );
          break;
        }

        const existingFiles = (form.values[targetField.id] as string[] | undefined) ?? [];
        const newFileIds = [...existingFiles, ...dto.attachmentFileIds!];
        form.values = { ...form.values, [targetField.id]: newFileIds };
        form.unconfirmedFieldIds = form.unconfirmedFieldIds.filter((id) => id !== targetField.id);
        updatedValuesThisTurn[targetField.id] = newFileIds;
        this.em.persist(form);
        skippedFieldIds = skippedFieldIds.filter((id) => id !== targetField.id);

        const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
          skippedFieldIds,
          unconfirmedFieldIds: form.unconfirmedFieldIds,
        });
        const confirmMsg = await this.nlgService.answerOtherFieldConfirmed(
          targetField,
          dto.attachmentFileIds!,
          currentField,
          formName,
          historyMessages,
        );
        const resolved = await this.resolveSlotResult(slotResult, formName, historyMessages, conversation, skippedFieldIds);
        reply = `${confirmMsg}\n\n${resolved.reply}`;
        currentFieldId = resolved.currentFieldId;
        resultStatus = resolved.status;
        break;
      }

      default: {
        reply = await this.nlgService.gibberishReply(currentField, formName, historyMessages);
        break;
      }
    }

    // Step 4: Append assistant reply
    conversation.messages = [
      ...conversation.messages,
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ];

    // Step 5: Update conversation state
    conversation.currentFieldId = currentFieldId;
    conversation.status = resultStatus;
    conversation.skippedFieldIds = skippedFieldIds;

    // Step 6: Save (flushes both form and conversation)
    await this.conversationService.save(conversation);

    return {
      messages: [reply],
      currentFieldId,
      updatedValues: updatedValuesThisTurn,
      status: resultStatus,
    };
  }

  async processSync(
    conversation: FormConversation,
    form: Form,
    allFields: FieldDto[],
    formName: string,
  ): Promise<{ messages: string[] }> {
    const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
      skippedFieldIds: conversation.skippedFieldIds,
      unconfirmedFieldIds: form.unconfirmedFieldIds,
    });
    const liveNextFieldId = slotResult.kind === 'field' ? slotResult.field.id : null;

    if (conversation.currentFieldId === liveNextFieldId) {
      return { messages: [] };
    }

    if (slotResult.kind === 'completed') {
      const reply = await this.nlgService.formComplete(
        formName,
        this.toLlmMessages(conversation.messages),
      );
      conversation.messages = [
        ...conversation.messages,
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ];
      conversation.currentFieldId = null;
      conversation.status = 'COMPLETED';
      await this.conversationService.save(conversation);
      return { messages: [reply] };
    }

    if (conversation.messages.length === 0) {
      const [welcomeMsg, firstAskMsg] = await Promise.all([
        this.nlgService.welcome(formName, this.toLlmMessages([])),
        this.nlgService.firstAsk(slotResult.field, formName, this.toLlmMessages([])),
      ]);
      conversation.messages = [
        { role: 'assistant', content: welcomeMsg, timestamp: new Date().toISOString() },
        { role: 'assistant', content: firstAskMsg, timestamp: new Date().toISOString() },
      ];
      conversation.currentFieldId = slotResult.field.id;
      conversation.status = 'COLLECTING';
      await this.conversationService.save(conversation);
      return { messages: [welcomeMsg, firstAskMsg] };
    }

    const reply = await this.nlgService.stateChange(
      slotResult.field,
      formName,
      this.toLlmMessages(conversation.messages),
    );
    conversation.messages = [
      ...conversation.messages,
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ];
    conversation.currentFieldId = slotResult.field.id;
    conversation.status = 'COLLECTING';
    await this.conversationService.save(conversation);
    return { messages: [reply] };
  }

  private validate(field: FieldDto, value: unknown, formValues: Record<string, unknown>): string[] {
    try {
      hardValidate(field, value);
    } catch (e: any) {
      return [e.message ?? 'Invalid value'];
    }
    const rules = getEffectiveRules(field, formValues);
    const errors: string[] = [];
    for (const rule of rules) {
      if (!rule.matches(value, formValues)) {
        errors.push(rule.errorMessage());
      }
    }
    return errors;
  }

  private async resolveSlotResult(
    slotResult: SlotResult,
    formName: string,
    messages: LlmMessage[],
    conversation: FormConversation,
    skippedFieldIds: string[],
  ): Promise<{ reply: string; currentFieldId: string | null; status: 'COLLECTING' | 'COMPLETED' }> {
    if (slotResult.kind === 'completed') {
      conversation.status = 'COMPLETED';
      const reply = await this.nlgService.formComplete(formName, messages);
      return { reply, currentFieldId: null, status: 'COMPLETED' };
    }
    const field = slotResult.field;
    let reply: string;
    if (skippedFieldIds.includes(field.id)) {
      reply = await this.nlgService.cyclingReask(field, formName, messages);
    } else if (field.type === 'file-upload') {
      reply = await this.nlgService.fileUploadReminder(field, formName, messages);
    } else {
      reply = messages.length > 0
        ? await this.nlgService.nextAsk(field, formName, messages)
        : await this.nlgService.firstAsk(field, formName, messages);
    }
    return { reply, currentFieldId: field.id, status: 'COLLECTING' };
  }

  private resolveTargetField(
    targetFieldId: string | undefined,
    visibleFields: FieldDto[],
  ): FieldDto | null {
    if (!targetFieldId) return null;
    return visibleFields.find((f) => f.id === targetFieldId) ?? null;
  }

  private toLlmMessages(messages: Array<{ role: string; content: string }>): LlmMessage[] {
    return messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  private isVisible(field: FieldDto, formValues: Record<string, unknown>): boolean {
    const visibleWhen = (field as unknown as BaseField).visibleWhen;
    if (visibleWhen === undefined) return true;
    return evaluateRuntimeConditionTree(visibleWhen, formValues);
  }
}

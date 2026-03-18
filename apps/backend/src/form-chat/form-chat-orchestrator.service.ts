import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/core';
import { FormEventContext } from '@formrig/sdk';
import { FormService } from '../form/form.service';
import { PluginService } from '../plugin/plugin.service';
import { FormConversationService } from './form-conversation.service';
import { FormChatFlowService } from './form-chat-flow.service';
import { FormChatStateMachine } from './form-chat-state-machine';
import { ChatTurnRequestDto } from './dto/chat-turn-request.dto';
import { ChatTurnResponseDto } from './dto/chat-turn-response.dto';
import { SyncResponseDto } from './dto/sync-response.dto';
import { GetChatConversationResponseDto } from './dto/get-chat-conversation-response.dto';
import { User } from '../dev-auth/entities/user.entity';
import { Form } from '../form/entities/form.entity';
import { FormConversation } from './entities/form-conversation.entity';

@Injectable()
export class FormChatOrchestratorService {
  private readonly stateMachine = new FormChatStateMachine();

  constructor(
    private readonly formService: FormService,
    private readonly pluginService: PluginService,
    private readonly conversationService: FormConversationService,
    private readonly flowService: FormChatFlowService,
    private readonly em: EntityManager,
  ) {}

  async handleSync(
    formId: string,
    user: User,
  ): Promise<SyncResponseDto> {
    // 1. Load form with ownership check
    const form = await this.formService.findOwnedForm(formId, user);

    // 2. Load plugin
    const loaded = this.pluginService.find(form.pluginId);
    if (!loaded) throw new NotFoundException(`Plugin "${form.pluginId}" is not loaded`);

    // 3. Derive live field list
    const { plugin, manifest } = loaded;
    const sourceFields =
      (plugin.definition.steps?.length ?? 0) > 0
        ? plugin.definition.steps!.flatMap((s) => s.fields)
        : (plugin.definition.fields ?? []);

    const clonedFields = sourceFields.map((f) =>
      Object.assign(Object.create(Object.getPrototypeOf(f)), f),
    );
    const ctx: FormEventContext = { fields: clonedFields };
    await plugin.events.created(ctx);

    const allFields = ctx.fields.map((f, index) => this.formService.serialiseField(f, index));

    // 4. Find or create conversation, acquire pessimistic lock, and run sync
    const result = await this.em.transactional(async () => {
      const conversation = await this.conversationService.findOrCreate(form, user.id);
      await this.em.lock(conversation, LockMode.PESSIMISTIC_WRITE);

      // 5. Form name
      const formName = plugin.definition.title ?? manifest.name;

      // 6. Delegate to flow service
      const { messages } = await this.flowService.processSync(conversation, form, allFields, formName);
      return { messages };
    });

    return result;
  }

  async handleTurn(
    formId: string,
    dto: ChatTurnRequestDto,
    user: User,
  ): Promise<ChatTurnResponseDto> {
    // 1. Load form with ownership check
    const form = await this.formService.findOwnedForm(formId, user);

    // 2. Load plugin
    const loaded = this.pluginService.find(form.pluginId);
    if (!loaded) throw new NotFoundException(`Plugin "${form.pluginId}" is not loaded`);

    // 3. Derive live field list (same pattern as FormService.getForm)
    const { plugin, manifest } = loaded;
    const sourceFields =
      (plugin.definition.steps?.length ?? 0) > 0
        ? plugin.definition.steps!.flatMap((s) => s.fields)
        : (plugin.definition.fields ?? []);

    const clonedFields = sourceFields.map((f) =>
      Object.assign(Object.create(Object.getPrototypeOf(f)), f),
    );
    const ctx: FormEventContext = { fields: clonedFields };
    await plugin.events.created(ctx);

    const allFields = ctx.fields.map((f, index) => this.formService.serialiseField(f, index));

    // 4. Find or create conversation
    const conversation = await this.conversationService.findOrCreate(form, user.id);

    // 5. Form name
    const formName = plugin.definition.title ?? manifest.name;

    // 6. Determine currentField
    let currentField = allFields.find((f) => f.id === conversation.currentFieldId) ?? null;

    if (currentField === null) {
      const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
        skippedFieldIds: conversation.skippedFieldIds,
        unconfirmedFieldIds: form.unconfirmedFieldIds,
      });
      if (slotResult.kind === 'field') {
        currentField = slotResult.field;
      }
      // else: completed → currentField remains null
    }

    return this.flowService.processTurn(
      conversation,
      form,
      allFields,
      currentField,
      dto,
      formName,
    );
  }

  async getConversation(
    formId: string,
    user: User,
  ): Promise<GetChatConversationResponseDto> {
    const form = await this.formService.findOwnedForm(formId, user);
    const conversation = await this.conversationService.findByForm(form, user.id);

    if (!conversation) {
      return { messages: [], currentFieldId: null, status: 'NOT_STARTED', syncRequired: true };
    }

    const syncRequired =
      conversation.status === 'COLLECTING'
        ? await this._computeSyncRequired(form, conversation)
        : false;

    return {
      messages: conversation.messages.map((m) => ({ role: m.role, content: m.content })),
      currentFieldId: conversation.currentFieldId,
      status: conversation.status,
      syncRequired,
    };
  }

  private async _computeSyncRequired(
    form: Form,
    conversation: FormConversation,
  ): Promise<boolean> {
    const loaded = this.pluginService.find(form.pluginId);
    if (!loaded) return false;

    const { plugin } = loaded;
    const sourceFields =
      (plugin.definition.steps?.length ?? 0) > 0
        ? plugin.definition.steps!.flatMap((s) => s.fields)
        : (plugin.definition.fields ?? []);

    const clonedFields = sourceFields.map((f) =>
      Object.assign(Object.create(Object.getPrototypeOf(f)), f),
    );
    const ctx: FormEventContext = { fields: clonedFields };
    await plugin.events.created(ctx);

    const allFields = ctx.fields.map((f, index) => this.formService.serialiseField(f, index));
    const slotResult = this.stateMachine.getNextSlot(allFields, form.values, {
      skippedFieldIds: conversation.skippedFieldIds,
      unconfirmedFieldIds: form.unconfirmedFieldIds,
    });

    const liveNextFieldId = slotResult.kind === 'field' ? slotResult.field.id : null;
    return conversation.currentFieldId !== liveNextFieldId;
  }
}

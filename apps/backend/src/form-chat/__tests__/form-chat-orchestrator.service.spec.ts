import { NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { FormChatOrchestratorService } from '../form-chat-orchestrator.service';
import { Form } from '../../form/entities/form.entity';
import { FormConversation } from '../entities/form-conversation.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORM_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const PLUGIN_ID = 'demo-form';

function makeForm(values: Record<string, unknown> = {}): Form {
  return {
    id: FORM_ID,
    pluginId: PLUGIN_ID,
    values,
    unconfirmedFieldIds: [],
  } as unknown as Form;
}

function makeConversation(partial: Partial<FormConversation> = {}): FormConversation {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    messages: [],
    skippedFieldIds: [],
    currentFieldId: null,
    status: 'COLLECTING',
    ...partial,
  } as FormConversation;
}

function makePlugin(overrides: { title?: string; fields?: any[] } = {}) {
  const createdMock = jest.fn().mockResolvedValue(undefined);
  return {
    manifest: { name: PLUGIN_ID },
    plugin: {
      definition: {
        title: overrides.title,
        fields: overrides.fields ?? [
          { label: 'Full Name', type: 'text', required: true },
        ],
      },
      events: { created: createdMock },
    },
    events: { created: createdMock },
    createdMock,
  };
}

function makeService(overrides: {
  findOwnedFormResult?: Form | null;
  findOwnedFormError?: Error;
  pluginResult?: ReturnType<typeof makePlugin> | undefined;
  conversationResult?: FormConversation;
  flowResult?: object;
}) {
  const form = overrides.findOwnedFormResult ?? makeForm();
  const findOwnedFormMock = overrides.findOwnedFormError
    ? jest.fn().mockRejectedValue(overrides.findOwnedFormError)
    : jest.fn().mockResolvedValue(form);

  const serialiseFieldMock = jest.fn().mockImplementation(
    (f: any, index: number) => ({
      id: `${f.label.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      label: f.label,
      type: f.type ?? 'text',
      required: f.required ?? true,
      disabled: false,
    }),
  );

  const formService = {
    findOwnedForm: findOwnedFormMock,
    serialiseField: serialiseFieldMock,
  };

  const loadedPlugin = overrides.pluginResult;
  const findPluginMock = jest.fn().mockReturnValue(loadedPlugin);
  const pluginService = { find: findPluginMock };

  const conversation = overrides.conversationResult ?? makeConversation();
  const findOrCreateMock = jest.fn().mockResolvedValue(conversation);
  const findByFormMock = jest.fn().mockResolvedValue(conversation);
  const conversationService = { findOrCreate: findOrCreateMock, findByForm: findByFormMock };

  const flowResult = overrides.flowResult ?? {
    messages: ['What is your full name?'],
    currentFieldId: 'full-name-0',
    updatedValues: {},
    status: 'COLLECTING',
  };
  const processTurnMock = jest.fn().mockResolvedValue(flowResult);
  const processSyncMock = jest.fn().mockResolvedValue(flowResult);
  const flowService = { processTurn: processTurnMock, processSync: processSyncMock };

  const em = {
    transactional: jest.fn().mockImplementation((cb: () => Promise<unknown>) => cb()),
    lock: jest.fn().mockResolvedValue(undefined),
  } as unknown as EntityManager;

  const svc = new FormChatOrchestratorService(
    formService as any,
    pluginService as any,
    conversationService as any,
    flowService as any,
    em,
  );

  return {
    svc,
    em,
    formService,
    pluginService,
    conversationService,
    flowService,
    findOwnedFormMock,
    findPluginMock,
    findOrCreateMock,
    findByFormMock,
    processTurnMock,
    processSyncMock,
    loadedPlugin,
    form,
    conversation,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FormChatOrchestratorService.handleTurn()', () => {
  const user = { id: USER_ID } as any;
  const dto = { message: 'Hello' };

  it('throws NotFoundException when form is not found', async () => {
    const { svc } = makeService({
      findOwnedFormError: new NotFoundException('Form not found'),
    });

    await expect(svc.handleTurn(FORM_ID, dto, user)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when plugin is not found', async () => {
    const { svc } = makeService({ pluginResult: undefined });

    await expect(svc.handleTurn(FORM_ID, dto, user)).rejects.toThrow(NotFoundException);
  });

  it('calls findOrCreate with the loaded form entity', async () => {
    const plugin = makePlugin();
    const { svc, findOrCreateMock, form } = makeService({ pluginResult: plugin as any });

    await svc.handleTurn(FORM_ID, dto, user);

    expect(findOrCreateMock).toHaveBeenCalledWith(form, USER_ID);
  });

  it('invokes plugin.events.created during field list derivation', async () => {
    const plugin = makePlugin();
    const { svc } = makeService({ pluginResult: plugin as any });

    await svc.handleTurn(FORM_ID, dto, user);

    expect(plugin.createdMock).toHaveBeenCalled();
  });

  it('delegates to flowService.processTurn with derived fields', async () => {
    const plugin = makePlugin({ fields: [{ label: 'Full Name', type: 'text', required: true }] });
    const { svc, processTurnMock, form, conversation } = makeService({
      pluginResult: plugin as any,
    });

    await svc.handleTurn(FORM_ID, dto, user);

    expect(processTurnMock).toHaveBeenCalledWith(
      conversation,
      form,
      expect.arrayContaining([expect.objectContaining({ label: 'Full Name' })]),
      expect.objectContaining({ label: 'Full Name' }), // currentField = first unanswered field
      dto,
      PLUGIN_ID, // formName = manifest.name when title is absent
    );
  });

  it('uses plugin definition title as formName when present', async () => {
    const plugin = makePlugin({ title: 'My Custom Form' });
    const { svc, processTurnMock } = makeService({ pluginResult: plugin as any });

    await svc.handleTurn(FORM_ID, dto, user);

    expect(processTurnMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'My Custom Form',
    );
  });

  it('passes currentField=null when state machine returns completed', async () => {
    const plugin = makePlugin({ fields: [] }); // no fields → completed immediately
    const { svc, processTurnMock } = makeService({ pluginResult: plugin as any });

    await svc.handleTurn(FORM_ID, dto, user);

    expect(processTurnMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [],
      null, // currentField = null
      expect.anything(),
      expect.anything(),
    );
  });

  it('returns result from flowService.processTurn directly (no wrapper, AC-2)', async () => {
    const plugin = makePlugin();
    const flowResponse = {
      messages: ['Please tell me your name.'],
      currentFieldId: 'full-name-0',
      updatedValues: {},
      status: 'COLLECTING' as const,
    };
    const { svc } = makeService({
      pluginResult: plugin as any,
      flowResult: flowResponse,
    });

    const result = await svc.handleTurn(FORM_ID, dto, user);

    expect(result).toEqual(flowResponse);
  });

  it('routes only to flowService.processTurn (never processSync)', async () => {
    const plugin = makePlugin();
    const { svc, processTurnMock, processSyncMock } = makeService({ pluginResult: plugin as any });

    await svc.handleTurn(FORM_ID, { message: 'Hello' }, user);

    expect(processTurnMock).toHaveBeenCalled();
    expect(processSyncMock).not.toHaveBeenCalled();
  });
});

describe('FormChatOrchestratorService.getConversation()', () => {
  const user = { id: USER_ID } as any;

  it('returns NOT_STARTED with syncRequired:true when no conversation exists (AC-9)', async () => {
    const plugin = makePlugin();
    const { svc, findByFormMock } = makeService({ pluginResult: plugin as any });
    findByFormMock.mockResolvedValue(null);

    const result = await svc.getConversation(FORM_ID, user);

    expect(result.status).toBe('NOT_STARTED');
    expect(result.syncRequired).toBe(true);
    expect(result.messages).toEqual([]);
    expect(result.currentFieldId).toBeNull();
  });

  it('returns COMPLETED with syncRequired:false (AC-10)', async () => {
    const plugin = makePlugin();
    const completedConversation = makeConversation({
      status: 'COMPLETED',
      currentFieldId: null,
      messages: [
        { role: 'assistant', content: 'Done!', timestamp: '2026-01-01T00:00:00.000Z' },
      ],
    });
    const { svc, findByFormMock } = makeService({ pluginResult: plugin as any });
    findByFormMock.mockResolvedValue(completedConversation);

    const result = await svc.getConversation(FORM_ID, user);

    expect(result.status).toBe('COMPLETED');
    expect(result.syncRequired).toBe(false);
  });

  it('strips timestamps from messages in returned DTO (AC-10)', async () => {
    const plugin = makePlugin();
    const conversation = makeConversation({
      status: 'COMPLETED',
      messages: [
        { role: 'assistant', content: 'Hello!', timestamp: '2026-01-01T00:00:00.000Z' },
        { role: 'user', content: 'Hi', timestamp: '2026-01-01T00:01:00.000Z' },
      ],
    });
    const { svc, findByFormMock } = makeService({ pluginResult: plugin as any });
    findByFormMock.mockResolvedValue(conversation);

    const result = await svc.getConversation(FORM_ID, user);

    expect(result.messages).toEqual([
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'Hi' },
    ]);
    expect((result.messages[0] as any).timestamp).toBeUndefined();
  });

  it('returns syncRequired:false for COLLECTING conversation when cursor matches live slot (AC-11)', async () => {
    const plugin = makePlugin({ fields: [{ label: 'Full Name', type: 'text', required: true }] });
    const conversation = makeConversation({
      status: 'COLLECTING',
      currentFieldId: 'full-name-0',
    });
    const { svc, findByFormMock } = makeService({ pluginResult: plugin as any });
    findByFormMock.mockResolvedValue(conversation);

    const result = await svc.getConversation(FORM_ID, user);

    expect(result.syncRequired).toBe(false);
  });

  it('returns syncRequired:true for COLLECTING conversation when cursor is behind live slot (AC-11)', async () => {
    const plugin = makePlugin({ fields: [{ label: 'Full Name', type: 'text', required: true }] });
    const conversation = makeConversation({
      status: 'COLLECTING',
      currentFieldId: null,
    });
    const { svc, findByFormMock } = makeService({ pluginResult: plugin as any });
    findByFormMock.mockResolvedValue(conversation);

    const result = await svc.getConversation(FORM_ID, user);

    expect(result.syncRequired).toBe(true);
  });
});

describe('FormChatOrchestratorService.handleSync()', () => {
  const user = { id: USER_ID } as any;

  it('throws NotFoundException when form is not found', async () => {
    const { svc } = makeService({
      findOwnedFormError: new NotFoundException('Form not found'),
    });

    await expect(svc.handleSync(FORM_ID, user)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when plugin is not found', async () => {
    const { svc } = makeService({ pluginResult: undefined });

    await expect(svc.handleSync(FORM_ID, user)).rejects.toThrow(NotFoundException);
  });

  it('calls flowService.processSync with correct arguments', async () => {
    const plugin = makePlugin({ fields: [{ label: 'Full Name', type: 'text', required: true }] });
    const { svc, processSyncMock, form, conversation } = makeService({
      pluginResult: plugin as any,
      flowResult: { messages: ['Welcome!', 'What is your name?'] },
    });

    await svc.handleSync(FORM_ID, user);

    expect(processSyncMock).toHaveBeenCalledWith(
      conversation,
      form,
      expect.arrayContaining([expect.objectContaining({ label: 'Full Name' })]),
      PLUGIN_ID,
    );
  });

  it('returns SyncResponseDto with messages from flowService.processSync (AC-2)', async () => {
    const plugin = makePlugin();
    const syncMessages = ['Welcome to the form!', 'What is your name?'];
    const { svc } = makeService({
      pluginResult: plugin as any,
      flowResult: { messages: syncMessages },
    });

    const result = await svc.handleSync(FORM_ID, user);

    expect(result).toEqual({ messages: syncMessages });
  });

  it('returns empty messages when sync not required', async () => {
    const plugin = makePlugin();
    const { svc } = makeService({
      pluginResult: plugin as any,
      flowResult: { messages: [] },
    });

    const result = await svc.handleSync(FORM_ID, user);

    expect(result).toEqual({ messages: [] });
  });

  it('uses plugin definition title as formName when present', async () => {
    const plugin = makePlugin({ title: 'My Custom Form' });
    const { svc, processSyncMock } = makeService({ pluginResult: plugin as any });

    await svc.handleSync(FORM_ID, user);

    expect(processSyncMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'My Custom Form',
    );
  });
});

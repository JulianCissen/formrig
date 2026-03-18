import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, NotFoundException } from '@nestjs/common';
import { FormChatController } from '../form-chat.controller';
import { FormChatOrchestratorService } from '../form-chat-orchestrator.service';
import { SyncResponseDto } from '../dto/sync-response.dto';
import { ChatTurnResponseDto } from '../dto/chat-turn-response.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORM_ID = '11111111-1111-1111-1111-111111111111';
const USER = { id: '22222222-2222-2222-2222-222222222222' } as any;

function makeController(overrides: {
  handleSyncResult?: SyncResponseDto;
  handleTurnResult?: ChatTurnResponseDto;
  handleSyncError?: Error;
  handleTurnError?: Error;
}) {
  const handleSyncMock = overrides.handleSyncError
    ? jest.fn().mockRejectedValue(overrides.handleSyncError)
    : jest.fn().mockResolvedValue(overrides.handleSyncResult ?? { messages: [] });

  const handleTurnMock = overrides.handleTurnError
    ? jest.fn().mockRejectedValue(overrides.handleTurnError)
    : jest.fn().mockResolvedValue(
        overrides.handleTurnResult ?? {
          messages: ['What is your name?'],
          currentFieldId: 'name-0',
          updatedValues: {},
          status: 'COLLECTING',
        },
      );

  const orchestratorService = {
    handleSync: handleSyncMock,
    handleTurn: handleTurnMock,
    getConversation: jest.fn().mockResolvedValue({ messages: [], currentFieldId: null, status: 'NOT_STARTED', syncRequired: true }),
  };

  const controller = new FormChatController(orchestratorService as any);

  return { controller, orchestratorService, handleSyncMock, handleTurnMock };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FormChatController.handleSync()', () => {
  it('calls orchestratorService.handleSync with formId and user', async () => {
    const { controller, handleSyncMock } = makeController({});

    await controller.handleSync(FORM_ID, USER);

    expect(handleSyncMock).toHaveBeenCalledWith(FORM_ID, USER);
  });

  it('returns SyncResponseDto from orchestratorService (200, AC-3)', async () => {
    const syncResult: SyncResponseDto = { messages: ['Welcome!', 'What is your name?'] };
    const { controller } = makeController({ handleSyncResult: syncResult });

    const result = await controller.handleSync(FORM_ID, USER);

    expect(result).toEqual(syncResult);
  });

  it('returns empty messages when sync not required', async () => {
    const { controller } = makeController({ handleSyncResult: { messages: [] } });

    const result = await controller.handleSync(FORM_ID, USER);

    expect(result).toEqual({ messages: [] });
  });

  it('re-throws HttpException from orchestrator unchanged', async () => {
    const err = new NotFoundException('Form not found');
    const { controller } = makeController({ handleSyncError: err });

    await expect(controller.handleSync(FORM_ID, USER)).rejects.toThrow(NotFoundException);
  });

  it('wraps non-HttpException errors as 502', async () => {
    const { controller } = makeController({ handleSyncError: new Error('LLM error') });

    await expect(controller.handleSync(FORM_ID, USER)).rejects.toMatchObject({
      status: 502,
    });
  });
});

describe('FormChatController.handleChatTurn()', () => {
  const BODY = { message: 'Hello' };

  it('calls orchestratorService.handleTurn with formId, body, and user', async () => {
    const { controller, handleTurnMock } = makeController({});

    await controller.handleChatTurn(FORM_ID, BODY, USER);

    expect(handleTurnMock).toHaveBeenCalledWith(FORM_ID, BODY, USER);
  });

  it('returns ChatTurnResponseDto directly (200, AC-2)', async () => {
    const turnResult: ChatTurnResponseDto = {
      messages: ['What is your email?'],
      currentFieldId: 'email-0',
      updatedValues: { 'name-0': 'John' },
      status: 'COLLECTING',
    };
    const { controller } = makeController({ handleTurnResult: turnResult });

    const result = await controller.handleChatTurn(FORM_ID, BODY, USER);

    expect(result).toEqual(turnResult);
  });

  it('re-throws HttpException from orchestrator unchanged', async () => {
    const err = new NotFoundException('Form not found');
    const { controller } = makeController({ handleTurnError: err });

    await expect(controller.handleChatTurn(FORM_ID, BODY, USER)).rejects.toThrow(NotFoundException);
  });

  it('wraps non-HttpException errors as 502', async () => {
    const { controller } = makeController({ handleTurnError: new Error('LLM error') });

    await expect(controller.handleChatTurn(FORM_ID, BODY, USER)).rejects.toMatchObject({
      status: 502,
    });
  });
});

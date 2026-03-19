import { NlgService } from '../nlg.service';
import { LlmMessage } from '../llm.service';
import { FieldDto } from '@formrig/shared';
import { PROMPT_DEFAULTS } from '../utils/prompt-defaults';
import { COMPACTION_THRESHOLD, CONTEXT_WINDOW_SIZE } from '../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_PERSONA = 'PERSONA';

function makeTextField(overrides: Partial<FieldDto> = {}): FieldDto {
  return {
    id: 'name-0',
    label: 'Full Name',
    type: 'text',
    required: true,
    disabled: false,
    hint: '',
    info: '',
    ...overrides,
  } as FieldDto;
}

function makeSelectField(overrides: Partial<FieldDto> = {}): FieldDto {
  return {
    id: 'colour-0',
    label: 'Favourite Colour',
    type: 'select',
    required: true,
    disabled: false,
    hint: '',
    info: '',
    options: ['Red', 'Green', 'Blue'],
    ...overrides,
  } as FieldDto;
}

function makeService(
  promptRecord?: { template: string; contextWindowSize: number | null } | null,
  chatResult = 'llm-response',
) {
  const promptRepo = {
    findOne: jest.fn().mockImplementation(({ key }: { key: string }) => {
      if (key === 'system.persona') {
        return Promise.resolve({ template: MOCK_PERSONA, contextWindowSize: null });
      }
      return Promise.resolve(promptRecord ?? null);
    }),
  };
  const chatMock = jest.fn().mockResolvedValue(chatResult);
  const llmService = { chat: chatMock };
  const svc = new NlgService(promptRepo as any, llmService as any);
  return { svc, promptRepo, chatMock };
}

function makeMessages(count: number): LlmMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? 'assistant' : 'user',
    content: `message-${i}`,
  })) as LlmMessage[];
}

// ---------------------------------------------------------------------------
// firstAsk()
// ---------------------------------------------------------------------------

describe('NlgService.firstAsk()', () => {
  const field = makeTextField();
  const history: LlmMessage[] = [{ role: 'assistant', content: 'Hello' }];

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    const result = await svc.firstAsk(field, 'My Form', history);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key from the repository', async () => {
    const { svc, promptRepo } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    await svc.firstAsk(field, 'My Form', history);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.first_ask' });
  });

  it('renders the template with correct variables (system message)', async () => {
    const { svc, chatMock } = makeService({
      template: 'Ask for {{fieldLabel}} ({{fieldType}}) in {{formName}}',
      contextWindowSize: null,
    });
    await svc.firstAsk(field, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nAsk for Full Name (text) in My Form`);
  });

  it('includes windowed history in LLM call', async () => {
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.firstAsk(field, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'Hello')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.firstAsk(field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('Full Name');
  });
});

// ---------------------------------------------------------------------------
// nextAsk()
// ---------------------------------------------------------------------------

describe('NlgService.nextAsk()', () => {
  const field = makeTextField();
  const history: LlmMessage[] = [{ role: 'assistant', content: 'Hello' }, { role: 'user', content: 'Hi' }];

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    const result = await svc.nextAsk(field, 'My Form', history);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key from the repository', async () => {
    const { svc, promptRepo } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    await svc.nextAsk(field, 'My Form', history);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.next_ask' });
  });

  it('renders the template with correct variables (system message)', async () => {
    const { svc, chatMock } = makeService({
      template: 'Next: {{fieldLabel}} ({{fieldType}}) in {{formName}}',
      contextWindowSize: null,
    });
    await svc.nextAsk(field, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nNext: Full Name (text) in My Form`);
  });

  it('includes windowed history in LLM call', async () => {
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.nextAsk(field, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'Hello')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.nextAsk(field, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('Full Name');
  });
});

// ---------------------------------------------------------------------------
// options rendering — AC-6 & AC-7
// ---------------------------------------------------------------------------

describe('NlgService options rendering (AC-6, AC-7)', () => {
  const enumField = makeSelectField();
  const textField = makeTextField();
  const history: LlmMessage[] = [];
  const EXPECTED_BULLET = 'Available options:\n- Red\n- Green\n- Blue';

  it('AC-6: firstAsk includes options bullet list for enum field', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.firstAsk(enumField, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain(EXPECTED_BULLET);
  });

  it('AC-6: nextAsk includes options bullet list for enum field', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.nextAsk(enumField, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain(EXPECTED_BULLET);
  });

  it('AC-6: stateChange includes options bullet list for enum field', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.stateChange(enumField, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain(EXPECTED_BULLET);
  });

  it('AC-7: firstAsk does NOT include "Available options" for text field', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.firstAsk(textField, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).not.toContain('Available options');
  });

  it('AC-7: nextAsk does NOT include "Available options" for text field', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.nextAsk(textField, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).not.toContain('Available options');
  });

  it('AC-7: stateChange does NOT include "Available options" for text field', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.stateChange(textField, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).not.toContain('Available options');
  });
});

// ---------------------------------------------------------------------------
// validationErrorReprompt()
// ---------------------------------------------------------------------------

describe('NlgService.validationErrorReprompt()', () => {
  const field = makeTextField();
  const errors = ['Too short', 'Invalid format'];
  const history: LlmMessage[] = [];

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{errors}}', contextWindowSize: null });
    const result = await svc.validationErrorReprompt(field, errors, 'My Form', history);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{errors}}', contextWindowSize: null });
    await svc.validationErrorReprompt(field, errors, 'My Form', history);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.validation_error' });
  });

  it('joins errors with "; " in template vars', async () => {
    const { svc, chatMock } = makeService({
      template: 'Errors: {{errors}}',
      contextWindowSize: null,
    });
    await svc.validationErrorReprompt(field, errors, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nErrors: Too short; Invalid format`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'bad input' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.validationErrorReprompt(field, errors, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'bad input')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.validationErrorReprompt(field, errors, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('Full Name');
  });
});

// ---------------------------------------------------------------------------
// clarificationAnswer()
// ---------------------------------------------------------------------------

describe('NlgService.clarificationAnswer()', () => {
  const field = makeTextField();
  const history: LlmMessage[] = [];

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{userQuestion}}', contextWindowSize: null });
    const result = await svc.clarificationAnswer('What does this mean?', field, 'My Form', history);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{userQuestion}}', contextWindowSize: null });
    await svc.clarificationAnswer('Q?', field, 'My Form', history);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.clarification' });
  });

  it('renders template with fieldLabel and userQuestion', async () => {
    const { svc, chatMock } = makeService({
      template: '{{fieldLabel}}: {{userQuestion}}',
      contextWindowSize: null,
    });
    await svc.clarificationAnswer('What does this mean?', field, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nFull Name: What does this mean?`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'clarify!' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.clarificationAnswer('Q?', field, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'clarify!')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.clarificationAnswer('Q?', field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// skipAcknowledgement()
// ---------------------------------------------------------------------------

describe('NlgService.skipAcknowledgement()', () => {
  const field = makeTextField();
  const history: LlmMessage[] = [];

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{fieldLabel}}{{willReask}}', contextWindowSize: null });
    const result = await svc.skipAcknowledgement(field, true, 'My Form', history);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: 'x', contextWindowSize: null });
    await svc.skipAcknowledgement(field, false, 'My Form', history);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.skip_ack' });
  });

  it('sets willReask to " It will be asked again later." when isRequired=true', async () => {
    const { svc, chatMock } = makeService({
      template: '{{fieldLabel}}{{willReask}}',
      contextWindowSize: null,
    });
    await svc.skipAcknowledgement(field, true, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nFull Name It will be asked again later.`);
  });

  it('sets willReask to "" when isRequired=false', async () => {
    const { svc, chatMock } = makeService({
      template: '{{fieldLabel}}{{willReask}}',
      contextWindowSize: null,
    });
    await svc.skipAcknowledgement(field, false, 'My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nFull Name`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'skip' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.skipAcknowledgement(field, false, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'skip')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.skipAcknowledgement(field, false, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formComplete()
// ---------------------------------------------------------------------------

describe('NlgService.formComplete()', () => {
  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{formName}}', contextWindowSize: null });
    const result = await svc.formComplete('My Form', []);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{formName}}', contextWindowSize: null });
    await svc.formComplete('My Form', []);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.form_complete' });
  });

  it('requires no field param — only formName', async () => {
    const { svc, chatMock } = makeService({
      template: 'Form {{formName}} complete',
      contextWindowSize: null,
    });
    await svc.formComplete('Registration', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nForm Registration complete`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'done' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.formComplete('My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'done')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.formComplete('My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fileUploadReminder()
// ---------------------------------------------------------------------------

describe('NlgService.fileUploadReminder()', () => {
  const field = makeTextField({ id: 'doc-0', label: 'Document', type: 'file-upload' });

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    const result = await svc.fileUploadReminder(field, 'My Form', []);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    await svc.fileUploadReminder(field, 'My Form', []);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.file_upload_reminder' });
  });

  it('uses empty fieldLabel when field=null', async () => {
    const { svc, chatMock } = makeService({
      template: 'Upload for: [{{fieldLabel}}]',
      contextWindowSize: null,
    });
    await svc.fileUploadReminder(null, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nUpload for: []`);
  });

  it('populates fieldList from ambiguousFields', async () => {
    const { svc, chatMock } = makeService({
      template: 'Fields: {{fieldList}}',
      contextWindowSize: null,
    });
    await svc.fileUploadReminder(null, 'My Form', [], [{ label: 'Resume' }, { label: 'ID' }]);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nFields: Resume, ID`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'uploading' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.fileUploadReminder(field, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'uploading')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.fileUploadReminder(field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// answerOtherFieldConfirmed()
// ---------------------------------------------------------------------------

describe('NlgService.answerOtherFieldConfirmed()', () => {
  const targetField = makeTextField({ id: 'email-1', label: 'Email' });
  const currentField = makeTextField({ id: 'name-0', label: 'Full Name' });

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{targetFieldLabel}}', contextWindowSize: null });
    const result = await svc.answerOtherFieldConfirmed(targetField, 'test@test.com', currentField, 'My Form', []);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{targetFieldLabel}}', contextWindowSize: null });
    await svc.answerOtherFieldConfirmed(targetField, 'val', currentField, 'My Form', []);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.answer_other_field_confirmed' });
  });

  it('renders targetFieldLabel and currentFieldLabel in system content', async () => {
    const { svc, chatMock } = makeService({
      template: 'Recorded {{targetFieldLabel}}: {{value}}. Now {{currentFieldLabel}}.',
      contextWindowSize: null,
    });
    await svc.answerOtherFieldConfirmed(targetField, 'a@b.com', currentField, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('Email');
    expect(systemMsg?.content).toContain('Full Name');
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'my email' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.answerOtherFieldConfirmed(targetField, 'val', currentField, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'my email')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.answerOtherFieldConfirmed(targetField, 'val', currentField, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// correctionConfirmed()
// ---------------------------------------------------------------------------

describe('NlgService.correctionConfirmed()', () => {
  const targetField = makeTextField({ id: 'email-1', label: 'Email' });
  const currentField = makeTextField({ id: 'name-0', label: 'Full Name' });

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{targetFieldLabel}}', contextWindowSize: null });
    const result = await svc.correctionConfirmed(targetField, 'new@email.com', currentField, 'My Form', []);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{targetFieldLabel}}', contextWindowSize: null });
    await svc.correctionConfirmed(targetField, 'val', currentField, 'My Form', []);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.correction_confirmed' });
  });

  it('renders template with correct vars', async () => {
    const { svc, chatMock } = makeService({
      template: '{{targetFieldLabel}} -> {{newValue}}. Next: {{currentFieldLabel}}',
      contextWindowSize: null,
    });
    await svc.correctionConfirmed(targetField, 'new@email.com', currentField, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nEmail -> new@email.com. Next: Full Name`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'correction' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.correctionConfirmed(targetField, 'val', currentField, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'correction')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.correctionConfirmed(targetField, 'val', currentField, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// gibberishReply()
// ---------------------------------------------------------------------------

describe('NlgService.gibberishReply()', () => {
  const field = makeTextField();

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    const result = await svc.gibberishReply(field, 'My Form', []);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    await svc.gibberishReply(field, 'My Form', []);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.gibberish_reply' });
  });

  it('renders template with fieldLabel', async () => {
    const { svc, chatMock } = makeService({
      template: 'Gibberish for {{fieldLabel}}',
      contextWindowSize: null,
    });
    await svc.gibberishReply(field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nGibberish for Full Name`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'asdfasdf' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.gibberishReply(field, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'asdfasdf')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.gibberishReply(field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// offTopicReply()
// ---------------------------------------------------------------------------

describe('NlgService.offTopicReply()', () => {
  const field = makeTextField();

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    const result = await svc.offTopicReply(field, 'My Form', []);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    await svc.offTopicReply(field, 'My Form', []);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.off_topic_reply' });
  });

  it('renders template with fieldLabel', async () => {
    const { svc, chatMock } = makeService({
      template: 'Off topic for {{fieldLabel}}',
      contextWindowSize: null,
    });
    await svc.offTopicReply(field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nOff topic for Full Name`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'weather today?' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.offTopicReply(field, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'weather today?')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.offTopicReply(field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cyclingReask()
// ---------------------------------------------------------------------------

describe('NlgService.cyclingReask()', () => {
  const field = makeTextField();

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    const result = await svc.cyclingReask(field, 'My Form', []);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key', async () => {
    const { svc, promptRepo } = makeService({ template: '{{fieldLabel}}', contextWindowSize: null });
    await svc.cyclingReask(field, 'My Form', []);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.cycling_reask' });
  });

  it('renders template with fieldLabel', async () => {
    const { svc, chatMock } = makeService({
      template: 'Cycling reask {{fieldLabel}}',
      contextWindowSize: null,
    });
    await svc.cyclingReask(field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nCycling reask Full Name`);
  });

  it('includes windowed history in LLM call', async () => {
    const msgs = [{ role: 'user', content: 'skip again' } as LlmMessage];
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.cyclingReask(field, 'My Form', msgs);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'skip again')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.cyclingReask(field, 'My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// prepareContextWindow() — tested via firstAsk()
// ---------------------------------------------------------------------------

describe('NlgService prepareContextWindow (via firstAsk)', () => {
  const field = makeTextField();

  it('passes messages unchanged when count <= window size', async () => {
    const msgs = makeMessages(5);
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: 20 });
    await svc.firstAsk(field, 'My Form', msgs);
    const llmMessages: LlmMessage[] = chatMock.mock.calls[0][0];
    // system + 5 history = 6
    expect(llmMessages.length).toBe(6);
  });

  it('deduplicates pinned messages already within the tail when at exact boundary', async () => {
    // windowSize=20, 21 messages → tailStartIndex=1 → pinned=[msg0], tail=[msg1..msg20]
    const msgs = makeMessages(21);
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.firstAsk(field, 'My Form', msgs);
    const llmMessages: LlmMessage[] = chatMock.mock.calls[0][0];
    // system + [msg0] + [msg1..msg20] = 1 + 1 + 20 = 22
    expect(llmMessages.length).toBe(22);
    // msg0 is the sole pinned entry (msg1 is already the first element of the tail)
    expect(llmMessages[1].content).toBe('message-0');
    // msg1 is the start of the tail and is not duplicated
    expect(llmMessages[2].content).toBe('message-1');
  });

  it('25 messages → only first 2 + last 20 returned (no duplicates)', async () => {
    const msgs = makeMessages(25);
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.firstAsk(field, 'My Form', msgs);
    const llmMessages: LlmMessage[] = chatMock.mock.calls[0][0];
    // system + (2 pinned + 20 tail) = 23
    expect(llmMessages.length).toBe(23);
    // First pinned message is message-0
    expect(llmMessages[1].content).toBe('message-0');
    // Second pinned is message-1
    expect(llmMessages[2].content).toBe('message-1');
    // Tail starts at message-5 (index 5 = 25 - 20)
    expect(llmMessages[3].content).toBe('message-5');
  });

  it('avoids duplicating pinned messages already in the tail', async () => {
    // 10 messages with window=10 — all fit, no pinning needed
    const msgs = makeMessages(10);
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: 10 });
    await svc.firstAsk(field, 'My Form', msgs);
    const llmMessages: LlmMessage[] = chatMock.mock.calls[0][0];
    // system + 10 = 11
    expect(llmMessages.length).toBe(11);
  });

  it('avoids duplicating pinned messages already in the tail (overlap case)', async () => {
    // 3 messages, window=3: tail covers all, pinned[0] and pinned[1] are in tail → no duplication
    const msgs = makeMessages(3);
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: 3 });
    await svc.firstAsk(field, 'My Form', msgs);
    const llmMessages: LlmMessage[] = chatMock.mock.calls[0][0];
    // system + 3 = 4
    expect(llmMessages.length).toBe(4);
  });

  it('respects per-prompt contextWindowSize override from the DB record', async () => {
    const msgs = makeMessages(10);
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: 5 });
    await svc.firstAsk(field, 'My Form', msgs);
    const llmMessages: LlmMessage[] = chatMock.mock.calls[0][0];
    // 10 messages, window=5 → pinned (2, since both indices 0,1 < tailStart=5) + 5 tail
    // system + 2 pinned + 5 tail = 8
    expect(llmMessages.length).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// prepareContextWindow() — compaction boundary tests
// ---------------------------------------------------------------------------

describe('NlgService — prepareContextWindow() compaction', () => {
  const field = makeTextField();

  it('does NOT trigger compaction when messages.length < COMPACTION_THRESHOLD', async () => {
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    const messages = makeMessages(COMPACTION_THRESHOLD - 1);

    await svc.firstAsk(field, 'My Form', messages);

    // Only one chat() call — the actual NLG call; no compaction call
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it('triggers compaction when messages.length === COMPACTION_THRESHOLD', async () => {
    // The promptRepo must return a valid template for BOTH the NLG prompt and the compaction prompt.
    const promptRepo = {
      findOne: jest.fn().mockResolvedValue({ template: 'sys-prompt', contextWindowSize: null }),
    };
    const chatMock = jest.fn()
      .mockResolvedValueOnce('compacted-summary')    // first call: compaction
      .mockResolvedValueOnce('nlg-reply');            // second call: NLG

    const svc = new NlgService(promptRepo as any, { chat: chatMock } as any);
    const messages = makeMessages(COMPACTION_THRESHOLD);

    const result = await svc.firstAsk(field, 'My Form', messages);

    expect(result).toBe('nlg-reply');
    expect(chatMock).toHaveBeenCalledTimes(2);

    // Second call's messages must include the summary message (isSummary: true)
    const secondCallMessages: LlmMessage[] = chatMock.mock.calls[1][0];
    expect(secondCallMessages.some((m) => (m as any).isSummary === true)).toBe(true);
    // System message is prepended; tail is at most CONTEXT_WINDOW_SIZE messages
    const nonSystemMessages = secondCallMessages.filter((m) => m.role !== 'system');
    // 1 summary + up to CONTEXT_WINDOW_SIZE history = at most CONTEXT_WINDOW_SIZE + 1
    expect(nonSystemMessages.length).toBeLessThanOrEqual(CONTEXT_WINDOW_SIZE + 1);
  });

  it('does not mutate the input messages array (Phase 1 path)', async () => {
    const { svc } = makeService({ template: 'x', contextWindowSize: null });
    const messages = makeMessages(5);
    const originalLength = messages.length;
    const firstContent = messages[0].content;

    await svc.firstAsk(field, 'My Form', messages);

    expect(messages.length).toBe(originalLength);
    expect(messages[0].content).toBe(firstContent);
  });

  it('does not mutate the input messages array (compaction path)', async () => {
    const promptRepo = {
      findOne: jest.fn().mockResolvedValue({ template: 'sys-prompt', contextWindowSize: null }),
    };
    const chatMock = jest.fn()
      .mockResolvedValueOnce('compacted-summary')
      .mockResolvedValueOnce('nlg-reply');
    const svc = new NlgService(promptRepo as any, { chat: chatMock } as any);
    const messages = makeMessages(COMPACTION_THRESHOLD);
    const originalLength = messages.length;
    const firstContent = messages[0].content;

    await svc.firstAsk(field, 'My Form', messages);

    expect(messages.length).toBe(originalLength);
    expect(messages[0].content).toBe(firstContent);
  });

  it('respects per-prompt contextWindowSize override (5 messages from 20-message history)', async () => {
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: 5 });
    const messages = makeMessages(20);

    await svc.firstAsk(field, 'My Form', messages);

    const sentMessages: LlmMessage[] = chatMock.mock.calls[0][0];
    // system message + up to windowSize tail + up to 2 pinned first exchange messages
    // 20 messages, window=5 → 2 pinned (indices 0,1 < tailStart=15) + 5 tail = 7
    // (vs. default CONTEXT_WINDOW_SIZE=20 which would pass all 20 unchanged)
    const historyMessages = sentMessages.filter((m) => m.role !== 'system');
    expect(historyMessages.length).toBeLessThanOrEqual(7);
  });
});

// ---------------------------------------------------------------------------
// welcome()
// ---------------------------------------------------------------------------

describe('NlgService.welcome()', () => {
  const history: LlmMessage[] = [{ role: 'assistant', content: 'Hello' }];

  it('returns the LLM response string', async () => {
    const { svc } = makeService({ template: '{{formName}}', contextWindowSize: null });
    const result = await svc.welcome('My Form', history);
    expect(result).toBe('llm-response');
  });

  it('loads the correct prompt key from the repository', async () => {
    const { svc, promptRepo } = makeService({ template: '{{formName}}', contextWindowSize: null });
    await svc.welcome('My Form', history);
    expect(promptRepo.findOne).toHaveBeenCalledWith({ key: 'nlg.welcome' });
  });

  it('renders the template with formName template variable (system message)', async () => {
    const { svc, chatMock } = makeService({
      template: 'Welcome to {{formName}}!',
      contextWindowSize: null,
    });
    await svc.welcome('Registration', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe(`${MOCK_PERSONA}\n\nWelcome to Registration!`);
  });

  it('includes windowed history in LLM call', async () => {
    const { svc, chatMock } = makeService({ template: 'x', contextWindowSize: null });
    await svc.welcome('My Form', history);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.content === 'Hello')).toBe(true);
  });

  it('falls back to PROMPT_DEFAULTS when repository returns null', async () => {
    const { svc, chatMock } = makeService(null);
    await svc.welcome('My Form', []);
    const messages: LlmMessage[] = chatMock.mock.calls[0][0];
    expect(messages.some((m) => m.role === 'system')).toBe(true);
  });
});

import { NluService, IntentClassificationResult } from '../nlu.service';
import { LlmMessage } from '../llm.service';
import { FieldDto } from '@formrig/shared';
import { PROMPT_DEFAULTS } from '../utils/prompt-defaults';
import { CONTEXT_WINDOW_SIZE } from '../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTextField(overrides: Partial<FieldDto> = {}): FieldDto {
  return {
    id: 'name-0',
    label: 'Full Name',
    type: 'text',
    required: true,
    disabled: false,
    ...overrides,
  } as FieldDto;
}

function makeFileUploadField(): FieldDto {
  return {
    id: 'doc-0',
    label: 'Document',
    type: 'file-upload',
    required: false,
    disabled: false,
  } as FieldDto;
}

function makeService(
  promptTemplate?: string,
  chatStructuredResult?: unknown,
) {
  const promptRecord = promptTemplate !== undefined
    ? { template: promptTemplate }
    : null;

  const promptRepo = {
    findOne: jest.fn().mockResolvedValue(promptRecord),
  };

  const chatStructuredMock = jest.fn().mockResolvedValue(chatStructuredResult ?? null);
  const llmService = {
    chatStructured: chatStructuredMock,
  };

  const svc = new NluService(promptRepo as any, llmService as any);
  return { svc, promptRepo, chatStructuredMock };
}

// ---------------------------------------------------------------------------
// classifyIntent()
// ---------------------------------------------------------------------------

describe('NluService.classifyIntent()', () => {
  const currentField = { id: 'name-0', label: 'Full Name' };
  const visibleFields = [
    { id: 'name-0', label: 'Full Name' },
    { id: 'email-1', label: 'Email' },
  ];
  const history: LlmMessage[] = [
    { role: 'assistant', content: 'What is your full name?' },
  ];

  it('returns the intent result from the LLM', async () => {
    const llmResult: IntentClassificationResult = { intent: 'ANSWER' };
    const { svc } = makeService('Classify for {{fieldLabel}}: {{message}}', llmResult);

    const result = await svc.classifyIntent('John', currentField, visibleFields, history);

    expect(result.intent).toBe('ANSWER');
    expect(result.targetFieldId).toBeUndefined();
  });

  it('returns targetFieldId when LLM includes it', async () => {
    const llmResult: IntentClassificationResult = { intent: 'CORRECTION', targetFieldId: 'email-1' };
    const { svc } = makeService('Classify for {{fieldLabel}}', llmResult);

    const result = await svc.classifyIntent('Change email', currentField, visibleFields, history);

    expect(result.intent).toBe('CORRECTION');
    expect(result.targetFieldId).toBe('email-1');
  });

  it('renders the prompt template with fieldLabel and message', async () => {
    const { svc, chatStructuredMock } = makeService(
      'Intent for {{fieldLabel}} from: {{message}}',
      { intent: 'ANSWER' },
    );

    await svc.classifyIntent('John', currentField, visibleFields, history);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe('Intent for Full Name from: John');
  });

  it('includes conversation history and user message in LLM call', async () => {
    const { svc, chatStructuredMock } = makeService(
      'Classify {{fieldLabel}}',
      { intent: 'ANSWER' },
    );

    await svc.classifyIntent('John', currentField, visibleFields, history);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    expect(messages[0].role).toBe('system');
    expect(messages[1]).toEqual(history[0]);
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'John' });
  });

  it('passes the intent classification schema to chatStructured', async () => {
    const { svc, chatStructuredMock } = makeService('Classify', { intent: 'ANSWER' });

    await svc.classifyIntent('hi', currentField, visibleFields, []);

    const schema = chatStructuredMock.mock.calls[0][0] as Record<string, unknown>;
    const props = schema.properties as Record<string, unknown>;
    const intentProp = props.intent as Record<string, unknown>;
    expect(intentProp.enum).toContain('ANSWER');
    expect(intentProp.enum).toContain('SKIP_REQUEST');
    expect((intentProp.enum as string[]).includes('FILE_UPLOAD')).toBe(false);
    expect(schema.required).toContain('intent');
  });

  it('falls back to PROMPT_DEFAULTS when no DB record exists', async () => {
    const { svc, chatStructuredMock } = makeService(
      undefined, // null → falls back to PROMPT_DEFAULTS
      { intent: 'ANSWER' },
    );

    await svc.classifyIntent('hello', currentField, [], []);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const systemMsg = messages.find((m) => m.role === 'system');
    // The default template has {{fieldLabel}} and {{message}} replaced
    expect(systemMsg?.content).toContain('Full Name');
    expect(systemMsg?.content).toContain('hello');
  });

  it('includes visible fields in rendered system prompt when template uses {{visibleFields}}', async () => {
    const { svc, chatStructuredMock } = makeService(
      'Fields: {{visibleFields}}',
      { intent: 'ANSWER' },
    );

    await svc.classifyIntent('hi', currentField, visibleFields, []);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('name-0: Full Name');
    expect(systemMsg?.content).toContain('email-1: Email');
  });
});

// ---------------------------------------------------------------------------
// extractValue()
// ---------------------------------------------------------------------------

describe('NluService.extractValue()', () => {
  it('returns null immediately for file-upload fields without calling LLM', async () => {
    const { svc, chatStructuredMock } = makeService('Extract {{fieldLabel}}', null);

    const result = await svc.extractValue('here it is', makeFileUploadField(), {}, []);

    expect(result).toBeNull();
    expect(chatStructuredMock).not.toHaveBeenCalled();
  });

  it('returns the extracted value from the LLM response', async () => {
    const { svc } = makeService('Extract {{fieldLabel}} from: {{message}}', { value: 'John Smith' });

    const result = await svc.extractValue('John Smith', makeTextField(), {}, []);

    expect(result).toBe('John Smith');
  });

  it('returns null when LLM returns { value: null }', async () => {
    const { svc } = makeService('Extract {{fieldLabel}}', { value: null });

    const result = await svc.extractValue('some text', makeTextField(), {}, []);

    expect(result).toBeNull();
  });

  it('returns null when LLM returns a result without a value property', async () => {
    const { svc } = makeService('Extract {{fieldLabel}}', {});

    const result = await svc.extractValue('some text', makeTextField(), {}, []);

    expect(result).toBeNull();
  });

  it('returns null when LLM returns null result', async () => {
    const { svc } = makeService('Extract {{fieldLabel}}', null);

    const result = await svc.extractValue('some text', makeTextField(), {}, []);

    expect(result).toBeNull();
  });

  it('renders prompt template with fieldLabel and message', async () => {
    const { svc, chatStructuredMock } = makeService(
      'Extraction for {{fieldLabel}} — message: {{message}}',
      { value: 'Alice' },
    );

    await svc.extractValue('Alice', makeTextField({ label: 'First Name' }), {}, []);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe('Extraction for First Name — message: Alice');
  });

  it('passes conversation history and user message to chatStructured', async () => {
    const history: LlmMessage[] = [{ role: 'assistant', content: 'What is your name?' }];
    const { svc, chatStructuredMock } = makeService('Extract {{fieldLabel}}', { value: 'Bob' });

    await svc.extractValue('Bob', makeTextField(), {}, history);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    expect(messages[0].role).toBe('system');
    expect(messages[1]).toEqual(history[0]);
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'Bob' });
  });

  it('passes the field extraction schema (built from buildExtractionSchema) to chatStructured', async () => {
    const { svc, chatStructuredMock } = makeService('Extract', { value: 'hello' });

    await svc.extractValue('hello', makeTextField(), {}, []);

    const schema = chatStructuredMock.mock.calls[0][0] as Record<string, unknown>;
    // The schema wraps the value in an object with a "properties.value" key
    expect(schema.type).toBe('object');
    const props = schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty('value');
  });

  it('falls back to PROMPT_DEFAULTS when no DB record exists', async () => {
    const { svc, chatStructuredMock } = makeService(undefined, { value: 'test' });

    await svc.extractValue('test', makeTextField({ label: 'Name' }), {}, []);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const systemMsg = messages.find((m) => m.role === 'system');
    // Default template: 'Extract the value for {{fieldLabel}} from: {{message}}'
    expect(systemMsg?.content).toContain('Name');
    expect(systemMsg?.content).toContain('test');
  });
});

// ---------------------------------------------------------------------------
// identifyFileUploadTarget()
// ---------------------------------------------------------------------------

describe('NluService.identifyFileUploadTarget()', () => {
  it('returns { targetFieldId: null, confidence: "low" } immediately when no visible file-upload fields', async () => {
    const { svc, chatStructuredMock } = makeService('File assoc', null);

    const result = await svc.identifyFileUploadTarget(
      ['file-id-1'],
      [],
      'Attaching my resume',
      [],
    );

    expect(result).toEqual({ targetFieldId: null, confidence: 'low' });
    expect(chatStructuredMock).not.toHaveBeenCalled();
  });

  it('returns the LLM result when visible file-upload fields exist', async () => {
    const llmResult = { targetFieldId: 'resume-0', confidence: 'high' };
    const { svc } = makeService('Which field for: {{fields}}', llmResult);

    const result = await svc.identifyFileUploadTarget(
      ['file-id-1'],
      [{ id: 'resume-0', label: 'Resume' }],
      'Here is my resume',
      [],
    );

    expect(result).toEqual({ targetFieldId: 'resume-0', confidence: 'high' });
  });

  it('renders the prompt template with fields list', async () => {
    const { svc, chatStructuredMock } = makeService(
      'Fields available: {{fields}}',
      { targetFieldId: 'cv-0', confidence: 'high' },
    );

    await svc.identifyFileUploadTarget(
      ['file-id-1'],
      [
        { id: 'cv-0', label: 'CV' },
        { id: 'id-doc-1', label: 'ID Document' },
      ],
      'Uploading my CV',
      [],
    );

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('cv-0: CV');
    expect(systemMsg?.content).toContain('id-doc-1: ID Document');
  });

  it('passes conversation history and user message to chatStructured', async () => {
    const history: LlmMessage[] = [{ role: 'assistant', content: 'Please upload your CV.' }];
    const { svc, chatStructuredMock } = makeService(
      'File assoc: {{fields}}',
      { targetFieldId: 'cv-0', confidence: 'high' },
    );

    await svc.identifyFileUploadTarget(
      ['file-id-1'],
      [{ id: 'cv-0', label: 'CV' }],
      'Here it is',
      history,
    );

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    expect(messages[0].role).toBe('system');
    expect(messages[1]).toEqual(history[0]);
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'Here it is' });
  });

  it('uses a fallback user message when userMessage is empty', async () => {
    const { svc, chatStructuredMock } = makeService(
      'File assoc: {{fields}}',
      { targetFieldId: 'cv-0', confidence: 'low' },
    );

    await svc.identifyFileUploadTarget(
      ['file-id-1', 'file-id-2'],
      [{ id: 'cv-0', label: 'CV' }],
      '',
      [],
    );

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.content).toContain('2 file(s)');
  });

  it('passes the file association schema to chatStructured', async () => {
    const { svc, chatStructuredMock } = makeService(
      'File assoc: {{fields}}',
      { targetFieldId: null, confidence: 'low' },
    );

    await svc.identifyFileUploadTarget(
      ['file-id-1'],
      [{ id: 'cv-0', label: 'CV' }],
      'Uploading',
      [],
    );

    const schema = chatStructuredMock.mock.calls[0][0] as Record<string, unknown>;
    expect(schema.required).toContain('targetFieldId');
    expect(schema.required).toContain('confidence');
    const props = schema.properties as Record<string, unknown>;
    const confidenceProp = props.confidence as Record<string, unknown>;
    expect(confidenceProp.enum).toContain('high');
    expect(confidenceProp.enum).toContain('low');
  });

  it('falls back to PROMPT_DEFAULTS when no DB record exists', async () => {
    const { svc, chatStructuredMock } = makeService(
      undefined,
      { targetFieldId: 'cv-0', confidence: 'high' },
    );

    await svc.identifyFileUploadTarget(
      ['file-id-1'],
      [{ id: 'cv-0', label: 'CV' }],
      'Here',
      [],
    );

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const systemMsg = messages.find((m) => m.role === 'system');
    // Default: 'Which file-upload field does this attachment belong to? Fields: {{fields}}'
    expect(systemMsg?.content).toContain('cv-0: CV');
  });
});

// ---------------------------------------------------------------------------
// NluService — per-prompt window override
// ---------------------------------------------------------------------------

function makeServiceWithWindowSize(
  promptTemplate: string,
  contextWindowSize: number,
  chatStructuredResult?: unknown,
) {
  const promptRecord = { template: promptTemplate, contextWindowSize };
  const promptRepo = {
    findOne: jest.fn().mockResolvedValue(promptRecord),
  };
  const chatStructuredMock = jest.fn().mockResolvedValue(chatStructuredResult ?? null);
  const llmService = { chatStructured: chatStructuredMock };
  const svc = new NluService(promptRepo as any, llmService as any);
  return { svc, promptRepo, chatStructuredMock };
}

describe('NluService — per-prompt effectiveWindowSize', () => {
  it('classifyIntent() applies contextWindowSize:5 — only 5 history + 1 user message passed to LLM', async () => {
    const { svc, chatStructuredMock } = makeServiceWithWindowSize(
      'Classify {{fieldLabel}}: {{message}}',
      5,
      { intent: 'ANSWER' },
    );
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'assistant' : 'user',
      content: `msg-${i}`,
    })) as LlmMessage[];

    await svc.classifyIntent('hello', { id: 'f-0', label: 'Name' }, [], history);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    // system + windowed history (max 5) + 1 user message
    const nonSystem = messages.filter((m) => m.role !== 'system');
    // last message is the user turn appended, so history slice = nonSystem.length - 1
    expect(nonSystem.length - 1).toBeLessThanOrEqual(5);
  });

  it('extractValue() applies contextWindowSize:5 — only 5 history + 1 user message passed to LLM', async () => {
    const { svc, chatStructuredMock } = makeServiceWithWindowSize(
      'Extract {{fieldLabel}} from: {{message}}',
      5,
      { value: 'Alice' },
    );
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'assistant' : 'user',
      content: `msg-${i}`,
    })) as LlmMessage[];

    await svc.extractValue('Alice', makeTextField(), {}, history);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    const nonSystem = messages.filter((m) => m.role !== 'system');
    expect(nonSystem.length - 1).toBeLessThanOrEqual(5);
  });

  it('classifyIntent() uses default CONTEXT_WINDOW_SIZE when contextWindowSize is null', async () => {
    // makeService returns null for contextWindowSize (default behaviour)
    const { svc, chatStructuredMock } = makeService(
      'Classify {{fieldLabel}}: {{message}}',
      { intent: 'ANSWER' },
    );
    const history = Array.from({ length: 5 }, (_, i) => ({
      role: 'user' as const,
      content: `msg-${i}`,
    }));

    await svc.classifyIntent('hello', { id: 'f-0', label: 'Name' }, [], history);

    const messages: LlmMessage[] = chatStructuredMock.mock.calls[0][1];
    // 5 history messages should all be present (well under default window)
    expect(messages.filter((m) => m.role === 'user').length).toBeGreaterThanOrEqual(5);
  });
});

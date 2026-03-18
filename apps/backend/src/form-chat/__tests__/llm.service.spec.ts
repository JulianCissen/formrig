import { LlmService, LlmMessage } from '../llm.service';

const mockInvoke = jest.fn();
const mockStructuredInvoke = jest.fn();
const mockWithStructuredOutput = jest.fn().mockReturnValue({ invoke: mockStructuredInvoke });

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockInvoke,
    withStructuredOutput: mockWithStructuredOutput,
  })),
}));

function makeService(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string> = {
    LLM_API_KEY: 'test-api-key',
    LLM_MODEL: 'gpt-4o',
  };
  const configService = {
    get: jest.fn((key: string, fallback?: string) => overrides[key] ?? defaults[key] ?? fallback),
    getOrThrow: jest.fn((key: string) => {
      const value = overrides[key] ?? defaults[key];
      if (value === undefined) throw new Error(`Config key ${key} is required`);
      return value;
    }),
  };
  return new LlmService(configService as any);
}

describe('LlmService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWithStructuredOutput.mockReturnValue({ invoke: mockStructuredInvoke });
  });

  describe('chat()', () => {
    it('returns the content string from the LLM response', async () => {
      const svc = makeService();
      mockInvoke.mockResolvedValue({ content: 'Hello from the LLM' });

      const result = await svc.chat([{ role: 'user', content: 'Hello' }]);

      expect(result).toBe('Hello from the LLM');
    });

    it('maps all three message roles correctly', async () => {
      const { SystemMessage, HumanMessage, AIMessage } = jest.requireActual('@langchain/core/messages');

      const svc = makeService();
      mockInvoke.mockResolvedValue({ content: 'ok' });

      const messages: LlmMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi!' },
      ];

      await svc.chat(messages);

      const [[mappedMessages]] = mockInvoke.mock.calls;
      expect(mappedMessages[0]).toBeInstanceOf(SystemMessage);
      expect(mappedMessages[1]).toBeInstanceOf(HumanMessage);
      expect(mappedMessages[2]).toBeInstanceOf(AIMessage);
      expect(mappedMessages[0].content).toBe('You are a helpful assistant.');
      expect(mappedMessages[1].content).toBe('Hello!');
      expect(mappedMessages[2].content).toBe('Hi!');
    });

    it('throws when the model invoke rejects', async () => {
      const svc = makeService();
      mockInvoke.mockRejectedValue(new Error('LLM error'));

      await expect(svc.chat([{ role: 'user', content: 'test' }])).rejects.toThrow('LLM error');
    });
  });

  describe('chatStructured()', () => {
    it('calls withStructuredOutput(schema) with the provided schema and returns the parsed object', async () => {
      const svc = makeService();
      const schema = { type: 'object', properties: { name: { type: 'string' } } };
      const parsed = { name: 'Alice' };
      mockStructuredInvoke.mockResolvedValue(parsed);

      const result = await svc.chatStructured<{ name: string }>(schema, [
        { role: 'user', content: 'What is my name?' },
      ]);

      expect(mockWithStructuredOutput).toHaveBeenCalledWith(schema);
      expect(result).toEqual(parsed);
    });

    it('throws when the structured model invoke rejects', async () => {
      const svc = makeService();
      mockStructuredInvoke.mockRejectedValue(new Error('Structured LLM error'));

      await expect(
        svc.chatStructured({}, [{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('Structured LLM error');
    });
  });
});

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  isSummary?: boolean;
}

@Injectable()
export class LlmService {
  private readonly model: ChatOpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('LLM_API_KEY');
    const modelName = this.configService.get<string>('LLM_MODEL', 'gpt-4o');
    const baseURL = this.configService.get<string>('LLM_BASE_URL');

    this.model = new ChatOpenAI({
      model: modelName,
      apiKey,
      configuration: baseURL ? { baseURL } : undefined,
    });
  }

  private mapMessages(messages: LlmMessage[]) {
    return messages.map((m) => {
      switch (m.role) {
        case 'system':
          return new SystemMessage(m.content);
        case 'user':
          return new HumanMessage(m.content);
        case 'assistant':
          return new AIMessage(m.content);
      }
    });
  }

  async chat(messages: LlmMessage[]): Promise<string> {
    const response = await this.model.invoke(this.mapMessages(messages));
    const content = response.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  async chatStructured<T>(schema: Record<string, unknown>, messages: LlmMessage[]): Promise<T> {
    const result = await this.model.withStructuredOutput(schema).invoke(this.mapMessages(messages));
    return result as T;
  }
}

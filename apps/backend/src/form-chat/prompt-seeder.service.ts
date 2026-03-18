import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { FormChatPrompt } from './entities/form-chat-prompt.entity';
import { PROMPT_DEFAULTS } from './utils/prompt-defaults';

@Injectable()
export class PromptSeederService implements OnModuleInit {
  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    const em = this.em.fork();

    if (process.env.NODE_ENV !== 'production') {
      // Dev/test: wipe all rows so current PROMPT_DEFAULTS are always active after restart
      await em.nativeDelete(FormChatPrompt, {});
      for (const [key, template] of Object.entries(PROMPT_DEFAULTS)) {
        em.create(FormChatPrompt, { key, template, createdAt: new Date(), updatedAt: new Date() });
      }
    } else {
      // Production: never delete existing customised templates
      for (const [key, template] of Object.entries(PROMPT_DEFAULTS)) {
        const existing = await em.findOne(FormChatPrompt, { key });
        if (!existing) {
          em.create(FormChatPrompt, { key, template, createdAt: new Date(), updatedAt: new Date() });
        }
      }
    }

    await em.flush();
  }
}

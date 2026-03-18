import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { FormConversation } from './entities/form-conversation.entity';
import { Form } from '../form/entities/form.entity';

@Injectable()
export class FormConversationService {
  constructor(
    @InjectRepository(FormConversation)
    private readonly repo: EntityRepository<FormConversation>,
    private readonly em: EntityManager,
  ) {}

  async findOrCreate(form: Form, userId: string): Promise<FormConversation> {
    const existing = await this.repo.findOne({
      form: { id: form.id, owner: { id: userId } },
    });
    if (existing) return existing;

    const conv = this.em.create(FormConversation, {
      form,
      messages: [],
      skippedFieldIds: [],
      currentFieldId: null,
      status: 'COLLECTING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.persist(conv).flush();
    return conv;
  }

  async findByForm(form: Form, userId: string): Promise<FormConversation | null> {
    return (await this.repo.findOne({
      form: { id: form.id, owner: { id: userId } },
    })) ?? null;
  }

  async save(conversation: FormConversation): Promise<void> {
    await this.em.persist(conversation).flush();
  }
}

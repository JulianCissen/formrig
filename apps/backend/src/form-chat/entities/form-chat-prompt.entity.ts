import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../common/base.entity';

@Entity({ tableName: 'form_chat_prompts' })
export class FormChatPrompt extends BaseEntity {

  @Property({ columnType: 'text', unique: true, nullable: false })
  key!: string;

  @Property({ columnType: 'text', nullable: false })
  template!: string;

  @Property({ columnType: 'text', nullable: true, default: null })
  description: string | null = null;

  @Property({ columnType: 'integer', nullable: true, default: null })
  contextWindowSize: number | null = null;
}

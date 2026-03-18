import { Entity, Property, OneToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../common/base.entity';
import { Form } from '../../form/entities/form.entity';

@Entity({ tableName: 'form_conversations' })
export class FormConversation extends BaseEntity {

  @OneToOne(() => Form, f => f.conversation, { fieldName: 'form_id', unique: true, nullable: false, deleteRule: 'cascade' })
  form!: Form;

  @Property({ type: 'jsonb', nullable: false, default: '[]' })
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];

  @Property({ type: 'jsonb', nullable: false, default: '[]' })
  skippedFieldIds: string[] = [];

  @Property({ columnType: 'text', nullable: true, default: null })
  currentFieldId: string | null = null;

  @Property({ columnType: 'text', nullable: false, default: 'COLLECTING' })
  status: 'COLLECTING' | 'COMPLETED' = 'COLLECTING';
}

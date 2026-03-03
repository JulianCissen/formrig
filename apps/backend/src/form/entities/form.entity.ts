// apps/backend/src/form/entities/form.entity.ts
import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../../common/base.entity';
import { FileRecord } from './file-record.entity';

@Entity({ tableName: 'forms' })
export class Form extends BaseEntity {
  /** The plugin manifest `name` that owns this form's structure. Permanent. */
  @Property({ columnType: 'text', nullable: false })
  pluginId!: string;

  /**
   * User-entered field values, keyed by fieldId.
   * Schema: Record<string, unknown>
   * Never contains structural/definition data.
   */
  @Property({ type: 'jsonb', default: '{}' })
  values: Record<string, unknown> = {};

  /** ISO timestamp set when the form is submitted. Null until submission. */
  @Property({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null = null;

  @OneToMany(() => FileRecord, r => r.form)
  fileRecords = new Collection<FileRecord>(this);
}

// apps/backend/src/form/entities/file-record.entity.ts
import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../common/base.entity';
import { Form } from './form.entity';

@Entity({ tableName: 'file_records' })
export class FileRecord extends BaseEntity {
  @ManyToOne(() => Form, { nullable: false, deleteRule: 'cascade' })
  form!: Form;

  /** The fieldId in the plugin definition this file belongs to. */
  @Property({ columnType: 'text' })
  fieldId!: string;

  /** Original filename as provided by the uploader. */
  @Property({ columnType: 'text' })
  filename!: string;

  /**
   * The storage key used with IFileStoragePlugin.
   * Always a UUID-based value, never user-controlled.
   */
  @Property({ columnType: 'text' })
  storageKey!: string;

  @Property({ columnType: 'text' })
  mimeType!: string;

  /** File size in bytes. */
  @Property({ columnType: 'integer' })
  size!: number;
}

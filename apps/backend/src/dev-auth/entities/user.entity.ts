// apps/backend/src/dev-auth/entities/user.entity.ts
import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../common/base.entity';

@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Property({ type: 'text' })
  @Unique()
  sub!: string;

  @Property({ type: 'jsonb' })
  claims!: Record<string, unknown>;
}

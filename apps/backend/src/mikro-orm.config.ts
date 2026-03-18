// apps/backend/src/mikro-orm.config.ts
// Used by both the MikroORM CLI (migration generation) and MikroOrmModule at runtime.
// Reads from process.env directly so the CLI can use it without NestJS DI.
import { defineConfig }  from '@mikro-orm/postgresql';
import { BaseEntity }    from './common/base.entity';
import { Form }          from './form/entities/form.entity';
import { FileRecord }    from './form/entities/file-record.entity';
import { User }          from './dev-auth/entities/user.entity';
import { FormConversation } from './form-chat/entities/form-conversation.entity';
import { FormChatPrompt }   from './form-chat/entities/form-chat-prompt.entity';

export default defineConfig({
  host:     process.env.POSTGRES_HOST     ?? 'localhost',
  port:     Number(process.env.POSTGRES_PORT ?? 5432),
  dbName:   process.env.POSTGRES_DB       ?? 'formrig',
  user:     process.env.POSTGRES_USER     ?? 'formrig',
  password: process.env.POSTGRES_PASSWORD ?? 'formrig',
  entities:  [BaseEntity, Form, FileRecord, User, FormConversation, FormChatPrompt],
  migrations: {
    path:          './src/migrations',
    pathTs:        './src/migrations',
    glob:          '!(*.d).{js,ts}',
    transactional: true,
  },
  debug: process.env.NODE_ENV !== 'production',
});

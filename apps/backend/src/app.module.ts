import { Module }             from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule }     from '@mikro-orm/nestjs';
import { PostgreSqlDriver }   from '@mikro-orm/postgresql';
import { PluginModule }       from './plugin/plugin.module';
import { FileStorageModule }  from './file-storage/file-storage.module';
import { FormModule }         from './form/form.module';
import { BaseEntity }         from './common/base.entity';
import { Form }               from './form/entities/form.entity';
import { FileRecord }         from './form/entities/file-record.entity';
import { MikroOrmLogger }     from './common/mikro-orm-logger';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRootAsync({
      useFactory: (cfg: ConfigService) => ({
        driver:   PostgreSqlDriver,
        host:     cfg.get('POSTGRES_HOST',     'localhost'),
        port:     cfg.get<number>('POSTGRES_PORT', 5432),
        dbName:   cfg.get('POSTGRES_DB',       'formrig'),
        user:     cfg.get('POSTGRES_USER',     'formrig'),
        password: cfg.get('POSTGRES_PASSWORD', 'formrig'),
        entities:  [BaseEntity, Form, FileRecord],   // Populated in T-004
        migrations: {
          path:          './src/migrations',
          pathTs:        './src/migrations',
          glob:          '!(*.d).{js,ts}',
          transactional: true,
        },
        debug:         cfg.get('NODE_ENV') !== 'production',
        loggerFactory: () => new MikroOrmLogger(),
        autoMigrate: true,   // Run pending migrations automatically on startup
      }),
      inject: [ConfigService],
    }),
    PluginModule,
    FileStorageModule,
    FormModule,
  ],
})
export class AppModule {}

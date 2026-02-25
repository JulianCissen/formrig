import { Module }       from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PluginModule } from './plugin/plugin.module';
import { FormModule }   from './form/form.module';

@Module({
  imports: [
    // Load environment variables (.env file + process.env)
    // isGlobal: true means ConfigService is injectable everywhere without re-importing ConfigModule
    ConfigModule.forRoot({ isGlobal: true }),
    PluginModule,
    FormModule,
  ],
})
export class AppModule {}

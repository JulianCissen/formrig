import { Module }          from '@nestjs/common';
import { MikroOrmModule }  from '@mikro-orm/nestjs';
import { PluginModule }    from '../plugin/plugin.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { FormService }     from './form.service';
import { FormsController } from './forms.controller';
import { Form }            from './entities/form.entity';
import { FileRecord }      from './entities/file-record.entity';

@Module({
  imports:     [MikroOrmModule.forFeature([Form, FileRecord]), PluginModule, FileStorageModule],
  providers:   [FormService],
  controllers: [FormsController],
})
export class FormModule {}

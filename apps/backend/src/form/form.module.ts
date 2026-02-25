import { Module }          from '@nestjs/common';
import { PluginModule }    from '../plugin/plugin.module';
import { FormService }     from './form.service';
import { FormController }  from './form.controller';

@Module({
  imports:     [PluginModule],
  providers:   [FormService],
  controllers: [FormController],
})
export class FormModule {}

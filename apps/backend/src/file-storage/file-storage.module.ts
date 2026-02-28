// apps/backend/src/file-storage/file-storage.module.ts
import { Module }                  from '@nestjs/common';
import { ConfigModule }            from '@nestjs/config';
import { ScheduleModule }          from '@nestjs/schedule';
import { StoragePluginService }    from './storage-plugin.service';
import { AntivirusPluginService }  from './antivirus-plugin.service';
import { FilePipelineService }     from './file-pipeline.service';
import { QuarantineCleanupService } from './quarantine-cleanup.service';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [
    StoragePluginService,
    AntivirusPluginService,
    FilePipelineService,
    QuarantineCleanupService,
  ],
  exports: [StoragePluginService, FilePipelineService],
})
export class FileStorageModule {}

import { Injectable, OnModuleInit, UnprocessableEntityException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import type { Readable } from 'stream';
import { FileMeta, AVScanResult } from '@formrig/sdk';
import { AntivirusPluginService } from './antivirus-plugin.service';
import { StoragePluginService }   from './storage-plugin.service';

@Injectable()
export class FilePipelineService implements OnModuleInit {
  private readonly logger = new Logger(FilePipelineService.name);

  constructor(
    private readonly storage: StoragePluginService,
    private readonly av: AntivirusPluginService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const dir = this.config.get<string>('QUARANTINE_DIR') ?? './quarantine';
    await fs.promises.mkdir(dir, { recursive: true });
    this.logger.log(`Quarantine directory ensured: ${dir}`);
  }

  async process(
    localPath: string,
    meta: FileMeta,
    storageKey: string,
  ): Promise<void> {
    // SEC-001: storageKey is always server-generated (UUID-based path: forms/<id>/<uuid>/<uuid>)
    // and never derived from user input, so no path-traversal sanitisation is required here.

    try {
      // STEP 1: AV scan (optional)
      if (this.av.isConfigured()) {
        const avStream: Readable = fs.createReadStream(localPath);
        let avResult: AVScanResult;
        try {
          avResult = await this.av.scan(avStream, meta);
        } catch (err) {
          avStream.destroy();
          throw err;
        }
        avStream.destroy();
        if (!avResult || typeof avResult.clean !== 'boolean') {
          throw new InternalServerErrorException('AV plugin returned invalid result');
        }
        if (!avResult.clean) {
          throw new UnprocessableEntityException('File rejected by antivirus scanner');
        }
      }

      // STEP 2: Upload to remote storage
      const uploadStream: Readable = fs.createReadStream(localPath);
      try {
        await this.storage.upload(storageKey, uploadStream, meta);
      } catch (err) {
        uploadStream.destroy();
        throw err;
      }

      // STEP 3: Delete local quarantine file (best-effort on success)
      await fs.promises.unlink(localPath).catch((err) => {
        this.logger.warn(`Failed to delete quarantine file after upload: ${localPath} — ${err}`);
      });

    } catch (err) {
      // Best-effort cleanup of the local quarantine file on any error path
      await fs.promises.unlink(localPath).catch((unlinkErr) => {
        this.logger.warn(`Failed to delete quarantine file during error cleanup: ${localPath} — ${unlinkErr}`);
      });
      throw err;
    }
  }
}

// apps/backend/src/file-storage/storage-plugin.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import { IFileStoragePlugin, isFileStoragePlugin, FileMeta } from '@formrig/sdk';
import type { Readable }                    from 'stream';
import * as path                            from 'path';
import { loadSinglePlugin }                from './plugin-loader.util';

@Injectable()
export class StoragePluginService implements IFileStoragePlugin, OnModuleInit {
  private readonly logger = new Logger(StoragePluginService.name);
  private readonly pluginPath: string;
  private loaded: IFileStoragePlugin | null = null;

  constructor(private readonly config: ConfigService) {
    const pluginPathRaw = this.config.get<string>('FILE_STORAGE_PLUGIN_FOLDER');
    if (!pluginPathRaw) {
      throw new Error('FILE_STORAGE_PLUGIN_FOLDER environment variable is not set.');
    }
    this.pluginPath = path.resolve(process.cwd(), pluginPathRaw);
    this.logger.log(`Storage plugin path resolved to: ${this.pluginPath}`);
  }

  async onModuleInit(): Promise<void> {
    this.loaded = await loadSinglePlugin<IFileStoragePlugin>({
      pluginPath: this.pluginPath,
      validator: (p): p is IFileStoragePlugin => {
        const result = isFileStoragePlugin(p);
        if (!result) {
          this.logger.error('Storage plugin failed validation: must implement upload, getUrl, and delete.');
        }
        return result;
      },
      config: this.config,
      logger: this.logger,
      label: 'storage plugin',
    });
  }

  // --- IFileStoragePlugin delegation ---

  private get plugin(): IFileStoragePlugin {
    if (!this.loaded) {
      throw new Error('StoragePluginService: storage plugin has not been initialised yet');
    }
    return this.loaded;
  }

  async upload(key: string, stream: Readable, meta: FileMeta): Promise<void> {
    return this.plugin.upload(key, stream, meta);
  }

  async getUrl(key: string): Promise<string> {
    return this.plugin.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    return this.plugin.delete(key);
  }
}

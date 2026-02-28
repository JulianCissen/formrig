import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import { IAntivirusPlugin, AVScanResult, FileMeta, isAntivirusPlugin } from '@formrig/sdk';
import type { Readable }                    from 'stream';
import * as path                            from 'path';
import { loadSinglePlugin }                from './plugin-loader.util';

@Injectable()
export class AntivirusPluginService implements OnModuleInit {
  private readonly logger = new Logger(AntivirusPluginService.name);
  private readonly pluginPath: string | null;
  private loaded: IAntivirusPlugin | null = null;

  constructor(private readonly config: ConfigService) {
    const pluginPathRaw = this.config.get<string>('AV_PLUGIN_FOLDER');
    this.pluginPath = pluginPathRaw ? path.resolve(process.cwd(), pluginPathRaw) : null;
    if (this.pluginPath) {
      this.logger.log(`AV plugin path resolved to: ${this.pluginPath}`);
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.pluginPath) {
      this.logger.warn('No AV plugin configured — uploads will not be scanned.');
      return;
    }

    try {
      this.loaded = await loadSinglePlugin<IAntivirusPlugin>({
        pluginPath: this.pluginPath,
        validator: (p): p is IAntivirusPlugin => {
          const result = isAntivirusPlugin(p);
          if (!result) {
            this.logger.error('AV plugin failed validation: must export a callable scan method.');
          }
          return result;
        },
        config: this.config,
        logger: this.logger,
        label: 'AV plugin',
      });
    } catch (err) {
      this.logger.warn(
        `Failed to load AV plugin — uploads will not be scanned. Reason: ${(err as Error).message}`,
      );
    }
  }

  /** Returns true when an AV plugin is loaded and ready to scan. */
  isConfigured(): boolean {
    return this.loaded !== null;
  }

  /** Delegate scan to the loaded plugin. Only call when isConfigured() === true. */
  async scan(stream: Readable, meta: FileMeta): Promise<AVScanResult> {
    return this.loaded!.scan(stream, meta);
  }
}

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import { PluginHost, LoadedPlugin }         from '@moduul/core';
import { FormTypePlugin, isFormTypePlugin } from '@formrig/sdk';
import * as path                            from 'path';

@Injectable()
export class PluginService implements OnModuleInit {
  private readonly logger = new Logger(PluginService.name);
  private readonly host: PluginHost<FormTypePlugin>;

  constructor(private readonly config: ConfigService) {
    // Resolve plugin folder: prefer PLUGIN_FOLDER env var, fall back to
    // ../../plugins relative to the CWD (which is apps/backend/ when nest start runs).
    const folderRaw = this.config.get<string>('PLUGIN_FOLDER') ?? '../../plugins';
    const folder    = path.resolve(process.cwd(), folderRaw);

    this.logger.log(`Plugin folder resolved to: ${folder}`);

    this.host = new PluginHost<FormTypePlugin>({
      folder,
      validator: isFormTypePlugin,
    });
  }

  /**
   * Called by NestJS after all module dependencies are resolved, before the app
   * starts accepting connections. Awaiting reload() here guarantees that plugins
   * are available before the first HTTP request arrives.
   */
  async onModuleInit(): Promise<void> {
    await this.host.reload();

    const loaded = this.host.getAll();
    if (loaded.length === 0) {
      this.logger.warn(
        'No plugins were loaded. Ensure plugins/demo-form/dist/index.js exists. ' +
        'Run: cd plugins/demo-form && npm install && npx moduul-builder build',
      );
    } else {
      this.logger.log(`Loaded ${loaded.length} plugin(s): ${loaded.map(p => p.manifest.name).join(', ')}`);
    }
  }

  /**
   * Returns all successfully loaded plugins.
   */
  getAll(): LoadedPlugin<FormTypePlugin>[] {
    return this.host.getAll();
  }

  /**
   * Looks up a plugin by its manifest name.
   * Returns undefined if the plugin was not loaded or failed validation.
   *
   * @param name - The `name` field from the plugin's `plugin.manifest.json`.
   */
  find(name: string): LoadedPlugin<FormTypePlugin> | undefined {
    return this.host.find(name);
  }

  /**
   * Clears all loaded plugins and rescans the plugins folder.
   * Can be called by an admin endpoint to support hot-reload at runtime.
   */
  async reload(): Promise<void> {
    await this.host.reload();
  }
}

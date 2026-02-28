import { Logger }        from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PluginHost }    from '@moduul/core';

export interface PluginLoadOptions<T> {
  pluginPath: string;
  validator:  (p: unknown) => p is T;
  config:     ConfigService;
  logger:     Logger;
  /** Human-readable label used in log messages, e.g. `'storage plugin'`. */
  label: string;
}

/**
 * Loads, validates, and initialises a single plugin from `pluginPath`.
 * Using `pluginPath` (rather than a directory) causes moduul to resolve
 * exactly one plugin, so no multi-plugin disambiguation is needed here.
 *
 * Throws if no plugin is found — callers that treat the plugin as optional
 * should catch and handle the error themselves.
 */
export async function loadSinglePlugin<T>(options: PluginLoadOptions<T>): Promise<T> {
  const { pluginPath, validator, config, logger, label } = options;

  const host = new PluginHost<T>({ pluginPath, validator });
  await host.reload();

  const all = host.getAll();
  if (all.length === 0) {
    throw new Error(
      `No ${label} loaded from "${pluginPath}". ` +
      'Ensure the path points to the plugin root and the plugin has been built.',
    );
  }

  // The loaded plugin type may declare optional init lifecycle hooks.
  const plugin = all[0].plugin as T & {
    requiredConfigKeys?: () => string[];
    init?:              (cfg: Record<string, string>) => Promise<void>;
  };

  const keys = plugin.requiredConfigKeys?.() ?? [];
  const pluginConfig: Record<string, string> = {};
  for (const key of keys) {
    pluginConfig[key] = config.get<string>(key) ?? '';
  }
  if (typeof plugin.init === 'function') {
    await plugin.init(pluginConfig);
  }

  logger.log(`Loaded ${label}: ${all[0].manifest.name}`);
  return plugin;
}

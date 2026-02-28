// packages/sdk/src/antivirus-plugin.ts
import type { Readable } from 'stream';
import type { AVScanResult, FileMeta } from './types.js';

/**
 * Plugin interface for antivirus scanner backends.
 *
 * Declared as an abstract class (not a TypeScript interface) so that
 * it can serve as a NestJS injection token if consumers choose to
 * import it as a class reference. Implementing it as `implements IAntivirusPlugin`
 * in the backend works identically to implementing a TypeScript interface.
 */
export abstract class IAntivirusPlugin {
  /**
   * Declare the environment-variable keys this plugin needs.
   *
   * AntivirusPluginService calls this method before calling init() and fetches only
   * the declared keys from NestJS ConfigService, building a narrow config map.
   * Plugins that do not implement this method receive an empty config map.
   *
   * @example
   * requiredConfigKeys() { return ['CLAMAV_HOST', 'CLAMAV_PORT']; }
   */
  requiredConfigKeys?(): string[];

  /** Optional init — receives config values from NestJS ConfigService at startup. */
  init?(config: Record<string, string>): Promise<void>;

  /**
   * Scan a file stream for viruses or malware.
   * @param stream  A readable stream of the file to scan.
   * @param meta    File metadata.
   */
  abstract scan(stream: Readable, meta: FileMeta): Promise<AVScanResult>;
}

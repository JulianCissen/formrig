// packages/sdk/src/file-storage-plugin.ts
import type { Readable } from 'stream';
import type { FileMeta } from './types.js';

/**
 * Plugin interface for file storage backends.
 *
 * Declared as an abstract class (not a TypeScript interface) so that
 * it can serve as a NestJS injection token if consumers choose to
 * import it as a class reference. Implementing it as `implements IFileStoragePlugin`
 * in the backend works identically to implementing a TypeScript interface.
 */
export abstract class IFileStoragePlugin {
  /**
   * Declare the environment-variable keys this plugin needs.
   *
   * StoragePluginService calls this method before calling init() and fetches only
   * the declared keys from NestJS ConfigService, building a narrow config map.
   * Plugins that do not implement this method receive an empty config map.
   *
   * @example
   * requiredConfigKeys() { return ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET']; }
   */
  requiredConfigKeys?(): string[];

  /**
   * Optional async initialization called by StoragePluginService after loading.
   * Receives config values resolved by NestJS ConfigService.
   */
  init?(config: Record<string, string>): Promise<void>;

  /**
   * Stream directly to active storage (used when AV is not configured).
   * @param key     Unique storage key (UUID-based; never user-controlled).
   * @param stream  Readable stream of file bytes.
   * @param meta    File metadata.
   */
  abstract upload(key: string, stream: Readable, meta: FileMeta): Promise<void>;

  /**
   * Resolve a publicly accessible or pre-signed URL for the given key.
   */
  abstract getUrl(key: string): Promise<string>;

  /**
   * Delete the stored file for the given key.
   */
  abstract delete(key: string): Promise<void>;
}

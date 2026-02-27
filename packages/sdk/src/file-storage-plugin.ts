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
   * Stream a file to a quarantine zone (key prefix: "quarantine/<...>").
   * The quarantine zone must NOT be user-accessible.
   */
  abstract uploadToQuarantine(
    quarantineKey: string,
    stream: Readable,
    meta: FileMeta,
  ): Promise<void>;

  /**
   * Atomically move a file from quarantine to active storage.
   * Must delete the quarantine entry on completion.
   * MinIO implementation: copyObject(src → dst) then removeObject(src).
   */
  abstract promoteFromQuarantine(
    quarantineKey: string,
    activeKey: string,
  ): Promise<void>;

  /**
   * Delete a quarantine entry (called when AV scan returns infected).
   */
  abstract deleteFromQuarantine(quarantineKey: string): Promise<void>;

  /**
   * Delete all quarantine objects whose storage timestamp is older than `olderThanMs`
   * milliseconds ago. Returns the number of objects deleted.
   *
   * Called periodically by QuarantineCleanupService to evict orphaned entries left
   * by AV scan crashes or network partitions.
   *
   * Optional — plugins that do not implement this method will cause the cleanup job
   * to log a warning and skip the run.
   *
   * @param olderThanMs  Objects modified more than this many ms ago are eligible.
   */
  purgeExpiredQuarantine?(olderThanMs: number): Promise<number>;

  /**
   * Resolve a publicly accessible or pre-signed URL for the given key.
   */
  abstract getUrl(key: string): Promise<string>;

  /**
   * Delete the stored file for the given key.
   */
  abstract delete(key: string): Promise<void>;
}

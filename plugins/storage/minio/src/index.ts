import { Readable } from 'stream';
import * as Minio from 'minio';
import { IFileStoragePlugin } from '@formrig/sdk';
import type { FileMeta } from '@formrig/sdk';

class MinioStoragePlugin implements IFileStoragePlugin {
  private client!: Minio.Client;
  private bucket!: string;

  requiredConfigKeys(): string[] {
    return ['MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET', 'MINIO_USE_SSL'];
  }

  async init(config: Record<string, string>): Promise<void> {
    this.bucket = config['MINIO_BUCKET'] ?? 'formrig';

    const accessKey = config['MINIO_ACCESS_KEY'];
    const secretKey = config['MINIO_SECRET_KEY'];
    if (!accessKey || !secretKey) {
      throw new Error('MinIO storage plugin requires MINIO_ACCESS_KEY and MINIO_SECRET_KEY env vars');
    }

    this.client = new Minio.Client({
      endPoint:  config['MINIO_ENDPOINT'] ?? 'localhost',
      port:      Number(config['MINIO_PORT'] ?? 9000),
      useSSL:    (config['MINIO_USE_SSL'] ?? 'false') === 'true',
      accessKey,
      secretKey,
    });

    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      try {
        await this.client.makeBucket(this.bucket);
        console.log(`[minio-storage] Created bucket: ${this.bucket}`);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
          throw err;
        }
      }
    }
  }

  async upload(key: string, stream: Readable, meta: FileMeta): Promise<void> {
    await this.client.putObject(
      this.bucket,
      key,
      stream,
      meta.size === -1 ? undefined : meta.size,
      { 'Content-Type': meta.mimeType },
    );
  }

  async uploadToQuarantine(quarantineKey: string, stream: Readable, meta: FileMeta): Promise<void> {
    await this.upload(quarantineKey, stream, meta);
  }

  async promoteFromQuarantine(quarantineKey: string, activeKey: string): Promise<void> {
    await this.client.copyObject(
      this.bucket,
      activeKey,
      `/${this.bucket}/${quarantineKey}`,
    );
    await this.client.removeObject(this.bucket, quarantineKey);
  }

  async deleteFromQuarantine(quarantineKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, quarantineKey);
  }

  /**
   * Lists all objects under the `quarantine/` prefix and removes those whose
   * `lastModified` timestamp is older than `olderThanMs` milliseconds ago.
   * Uses server-side batch removal (`removeObjects`) to minimise round-trips.
   *
   * @returns Number of objects deleted.
   */
  async purgeExpiredQuarantine(olderThanMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const keysToDelete: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = this.client.listObjectsV2(this.bucket, 'quarantine/', true);
      stream.on('data', (obj: Minio.BucketItem) => {
        if (obj.name && obj.lastModified && obj.lastModified < cutoff) {
          keysToDelete.push(obj.name);
        }
      });
      stream.on('error', reject);
      stream.on('end', resolve);
    });

    if (keysToDelete.length === 0) return 0;

    await this.client.removeObjects(this.bucket, keysToDelete);
    return keysToDelete.length;
  }

  async getUrl(key: string): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, 60 * 60);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}

export default new MinioStoragePlugin();

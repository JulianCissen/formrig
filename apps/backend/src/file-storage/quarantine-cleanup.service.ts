import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { Cron }               from '@nestjs/schedule';
import * as fs                from 'fs';
import * as path              from 'path';

/**
 * Periodically removes stale files from the local quarantine directory.
 *
 * Configuration (all optional, via environment variables):
 *
 * | Variable             | Default           | Description                                   |
 * |----------------------|-------------------|-----------------------------------------------|
 * | `QUARANTINE_DIR`     | `./quarantine`    | Local directory scanned for expired files     |
 * | `QUARANTINE_TTL_MS`  | `86400000` (24 h) | Files older than this threshold are deleted   |
 */
@Injectable()
export class QuarantineCleanupService {
  private readonly logger = new Logger(QuarantineCleanupService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Runs every hour on the hour.
   * Scans `QUARANTINE_DIR` for files whose `mtime` exceeds `QUARANTINE_TTL_MS`
   * and deletes them.
   */
  @Cron('0 * * * *')
  async purgeExpiredFiles(): Promise<void> {
    const dir   = this.config.get<string>('QUARANTINE_DIR')    ?? './quarantine';
    const ttlMs = parseInt(this.config.get<string>('QUARANTINE_TTL_MS') ?? '86400000', 10);
    const cutoff = Date.now() - ttlMs;

    let files: string[];
    try {
      files = await fs.promises.readdir(dir);
    } catch (err) {
      this.logger.warn(`Could not read quarantine dir "${dir}": ${err}`);
      return;
    }

    let deleted = 0;
    for (const filename of files) {
      const filePath = path.join(dir, filename);
      try {
        const stat = await fs.promises.stat(filePath);
        if (stat.mtimeMs < cutoff) {
          await fs.promises.unlink(filePath);
          deleted++;
        }
      } catch (err) {
        this.logger.warn(`Failed to process quarantine file "${filePath}": ${err}`);
      }
    }

    if (deleted > 0) {
      this.logger.log(`Quarantine cleanup: removed ${deleted} expired file(s) (TTL=${ttlMs}ms).`);
    } else {
      this.logger.debug('Quarantine cleanup: no expired files found.');
    }
  }
}

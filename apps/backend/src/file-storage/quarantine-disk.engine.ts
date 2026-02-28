import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageEngine } from 'multer';
import { Request } from 'express';

export class QuarantineDiskEngine implements StorageEngine {
  private readonly quarantineDir: string;

  constructor() {
    this.quarantineDir = process.env['QUARANTINE_DIR'] ?? './quarantine';
  }

  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    cb: (error?: Error | null, info?: Partial<Express.Multer.File>) => void,
  ): void {
    const filename = randomUUID();
    const filePath = path.join(this.quarantineDir, filename);
    const outStream = fs.createWriteStream(filePath);

    file.stream.pipe(outStream);

    outStream.on('error', (err) => {
      fs.unlink(filePath, () => cb(err));
    });

    outStream.on('finish', () => {
      fs.chmod(filePath, 0o640, (chmodErr) => {
        if (chmodErr) {
          console.warn(
            `[QuarantineDiskEngine] chmod failed for ${filePath}:`,
            chmodErr.message,
          );
        }
        cb(null, {
          destination: this.quarantineDir,
          filename,
          path: filePath,
          size: outStream.bytesWritten,
        });
      });
    });
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File & { path: string },
    cb: (error: Error | null) => void,
  ): void {
    fs.unlink(file.path, (err) => {
      if (err && err.code !== 'ENOENT') {
        cb(err);
        return;
      }
      cb(null);
    });
  }
}

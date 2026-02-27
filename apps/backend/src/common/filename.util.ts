import { extname } from 'path';
import { randomUUID } from 'crypto';

/**
 * Generates a deterministic filename for an uploaded file.
 *
 * The extension is derived from the *original filename* (lowercased).
 * The base name is either the caller-supplied `rename` value or a fresh UUID.
 * A `_${index}` suffix is always appended before the extension so that files
 * from multi-file uploads never collide and single-file uploads remain
 * consistent with the multi-file pattern.
 *
 * Examples:
 *   ('Report.PDF',  0)                    → '{uuid}_0.pdf'
 *   ('photo.JPG',   2)                    → '{uuid}_2.jpg'
 *   ('invoice.pdf', 0, 'uploaded')        → 'uploaded_0.pdf'
 *   ('data.CSV',    1, 'export')          → 'export_1.csv'
 *
 * @param originalName Client-supplied original filename (used only for extension).
 * @param index        Zero-based position of this file in the upload batch.
 * @param rename       Optional caller-controlled base name. Defaults to a new UUID.
 */
export function generateFilename(
  originalName: string,
  index: number,
  rename?: string,
): string {
  const ext      = extname(originalName).toLowerCase();
  const baseName = rename ?? randomUUID();
  return `${baseName}_${index}${ext}`;
}

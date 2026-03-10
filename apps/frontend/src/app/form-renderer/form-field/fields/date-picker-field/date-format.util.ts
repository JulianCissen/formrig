/**
 * Pure date formatting utilities for DatePickerFieldComponent.
 *
 * Supported format tokens: `dd` (day), `mm` (month), `yyyy` (year).
 * Separator: the first non-alphabetic character in the format string.
 * Valid format examples: `'dd-mm-yyyy'`, `'mm/dd/yyyy'`, `'yyyy.mm.dd'`.
 */

/**
 * Parses a user-typed date string according to the given display format.
 *
 * @param text   Raw text from the input element (trimmed before call).
 * @param format Display format string, e.g. `'dd-mm-yyyy'`.
 * @returns ISO `yyyy-mm-dd` string if the text is valid, or `null` on failure.
 */
export function parseDisplayDate(text: string, format: string): string | null {
  if (!text || !format) return null;

  const sep = format.match(/[^a-zA-Z]/)?.[0];
  if (!sep) return null;

  const fmtTokens = format.split(sep); // ['dd','mm','yyyy'] or similar
  const inputParts = text.split(sep);

  if (fmtTokens.length !== 3 || inputParts.length !== 3) return null;

  const tokenMap: Record<string, number> = {};
  for (let i = 0; i < 3; i++) {
    const val = parseInt(inputParts[i], 10);
    if (isNaN(val)) return null;
    tokenMap[fmtTokens[i]] = val;
  }

  const dd = tokenMap['dd'];
  const mm = tokenMap['mm'];
  const yyyy = tokenMap['yyyy'];

  if (dd === undefined || mm === undefined || yyyy === undefined) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1) return null;

  // Calendar round-trip: catches invalid days like Feb 30
  const dt = new Date(yyyy, mm - 1, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null;

  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Formats an ISO date string for display in the given format.
 *
 * @param iso    ISO date string (`yyyy-mm-dd`) or null.
 * @param format Display format string, e.g. `'dd-mm-yyyy'`.
 * @returns Formatted date string, or `''` if iso is null/invalid.
 */
export function formatIsoDate(iso: string | null | undefined, format: string): string {
  if (!iso || typeof iso !== 'string') return '';
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const [yyyy, mm, dd] = parts;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';

  const sep = format.match(/[^a-zA-Z]/)?.[0];
  if (!sep) return '';
  const fmtTokens = format.split(sep);
  if (fmtTokens.length !== 3) return '';

  const replacements: Record<string, string> = {
    dd:   String(dd).padStart(2, '0'),
    mm:   String(mm).padStart(2, '0'),
    yyyy: String(yyyy).padStart(4, '0'),
  };

  return fmtTokens.map(t => replacements[t] ?? t).join(sep);
}

import safe = require('safe-regex');

/**
 * Returns true if `pattern` is safe to compile and evaluate without risk of
 * catastrophic backtracking (ReDoS).
 *
 * Delegates to the `safe-regex` package (v2) for the analysis, with a fast-path
 * length cap applied first.
 *
 * Rejected patterns:
 *  1. Length > 500 characters (sanity cap — avoids feeding huge strings to safe-regex).
 *  2. Any pattern that `safe-regex` classifies as unsafe (nested / ambiguous quantifiers,
 *     exponential-time alternation structures, etc.).
 *  3. Invalid regex strings (safe-regex returns false for patterns that do not compile).
 */
export function isSafePattern(pattern: string): boolean {
  if (pattern.length > 500) return false;
  return safe(pattern);
}

import { isSafePattern } from '../regex-safety';

// ── Safe patterns ────────────────────────────────────────────────────────────

describe('isSafePattern — safe patterns', () => {
  it('accepts a simple literal', () => {
    expect(isSafePattern('hello')).toBe(true);
  });

  it('accepts a character class', () => {
    expect(isSafePattern('[a-z]')).toBe(true);
  });

  it('accepts an anchored digits pattern', () => {
    expect(isSafePattern('^\\d+$')).toBe(true);
  });

  it('accepts an email-like pattern', () => {
    expect(isSafePattern('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')).toBe(true);
  });

  it('accepts a word boundary pattern', () => {
    expect(isSafePattern('\\bword\\b')).toBe(true);
  });

  it('accepts an empty string', () => {
    expect(isSafePattern('')).toBe(true);
  });
});

// ── Unsafe patterns (classic ReDoS structures) ───────────────────────────────

describe('isSafePattern — unsafe patterns', () => {
  it('rejects (a+)+', () => {
    expect(isSafePattern('(a+)+')).toBe(false);
  });

  it('rejects (\\w+\\s*)+ (overlapping quantifiers)', () => {
    expect(isSafePattern('(\\w+\\s*)+')).toBe(false);
  });

  it('rejects (x+x+)+y', () => {
    expect(isSafePattern('(x+x+)+y')).toBe(false);
  });

  it('rejects ([a-z]+)*', () => {
    expect(isSafePattern('([a-z]+)*')).toBe(false);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('isSafePattern — edge cases', () => {
  it('rejects patterns longer than 500 characters without calling safe-regex', () => {
    const long = 'a'.repeat(501);
    expect(isSafePattern(long)).toBe(false);
  });

  it('accepts a pattern exactly 500 characters long (no fast-path rejection)', () => {
    const exactly500 = 'a'.repeat(500);
    expect(isSafePattern(exactly500)).toBe(true);
  });

  it('returns false for an invalid regex string', () => {
    // safe-regex returns false when the pattern cannot be compiled
    expect(isSafePattern('[')).toBe(false);
  });
});

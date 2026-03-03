import {
  EqualsRule,
  NotEqualsRule,
  IsEmptyRule,
  IsNotEmptyRule,
  ContainsRule,
  MatchesPatternRule,
  MinLengthRule,
  MaxLengthRule,
  MinCountRule,
  MaxCountRule,
  IsTrueRule,
  IsFalseRule,
  EqualsFieldRule,
  ComesAfterFieldRule,
  ComesBeforeFieldRule,
  RequiredRule,
} from '../rule';

// ── EqualsRule ───────────────────────────────────────────────────────────────

describe('EqualsRule', () => {
  const rule = new EqualsRule('hello');
  it('matches exact value', () => expect(rule.matches('hello')).toBe(true));
  it('fails on different value', () => expect(rule.matches('world')).toBe(false));
  it('fails on different type', () => expect(rule.matches(42)).toBe(false));
});

// ── NotEqualsRule ────────────────────────────────────────────────────────────

describe('NotEqualsRule', () => {
  const rule = new NotEqualsRule('hello');
  it('matches different value', () => expect(rule.matches('world')).toBe(true));
  it('fails on equal value', () => expect(rule.matches('hello')).toBe(false));
});

// ── IsEmptyRule ──────────────────────────────────────────────────────────────

describe('IsEmptyRule', () => {
  const rule = new IsEmptyRule();
  it.each([[''], [false], [[]], [null], [undefined]])(
    'returns true for %p',
    (v) => expect(rule.matches(v)).toBe(true),
  );
  it.each([['a'], [true], [['x']]])(
    'returns false for %p',
    (v) => expect(rule.matches(v)).toBe(false),
  );
});

// ── IsNotEmptyRule ───────────────────────────────────────────────────────────

describe('IsNotEmptyRule', () => {
  const rule = new IsNotEmptyRule();
  it.each([['a'], [true], [['x']]])(
    'returns true for %p',
    (v) => expect(rule.matches(v)).toBe(true),
  );
  it.each([[''], [false], [[]], [null], [undefined]])(
    'returns false for %p',
    (v) => expect(rule.matches(v)).toBe(false),
  );
});

// ── ContainsRule ─────────────────────────────────────────────────────────────

describe('ContainsRule', () => {
  const rule = new ContainsRule('foo');
  it('matches string containing substring', () => expect(rule.matches('foobar')).toBe(true));
  it('fails string not containing substring', () => expect(rule.matches('bar')).toBe(false));
  it('matches string[] containing the item', () => expect(rule.matches(['foo', 'bar'])).toBe(true));
  it('fails string[] not containing the item', () => expect(rule.matches(['bar', 'baz'])).toBe(false));
  it('fails for non-string, non-array', () => expect(rule.matches(42)).toBe(false));
});

// ── MatchesPatternRule ───────────────────────────────────────────────────────

describe('MatchesPatternRule', () => {
  it('matches when pattern matches', () => {
    expect(new MatchesPatternRule('^\\d+$').matches('123')).toBe(true);
  });
  it('fails when pattern does not match', () => {
    expect(new MatchesPatternRule('^\\d+$').matches('abc')).toBe(false);
  });
  it('coerces non-string value to string before testing', () => {
    expect(new MatchesPatternRule('^42$').matches(42)).toBe(true);
  });
  it('throws at construction time with invalid regex pattern', () => {
    // safe-regex rejects syntactically invalid patterns, so an Error is thrown
    // before new RegExp() is reached
    expect(() => new MatchesPatternRule('[invalid')).toThrow(Error);
  });
});

// ── MinLengthRule ────────────────────────────────────────────────────────────

describe('MinLengthRule', () => {
  const rule = new MinLengthRule(3);
  it('passes at exactly min length', () => expect(rule.matches('abc')).toBe(true));
  it('passes above min length', () => expect(rule.matches('abcd')).toBe(true));
  it('fails one below min length', () => expect(rule.matches('ab')).toBe(false));
  it('coerces non-string to string (number 5 has length 1 >= 1)', () => expect(new MinLengthRule(1).matches(5)).toBe(true));
  it('coerces non-string to string (123 coerces to "123", length 3 >= 3)', () => expect(rule.matches(123)).toBe(true));
});

// ── MaxLengthRule ────────────────────────────────────────────────────────────

describe('MaxLengthRule', () => {
  const rule = new MaxLengthRule(3);
  it('passes at exactly max length', () => expect(rule.matches('abc')).toBe(true));
  it('passes below max length', () => expect(rule.matches('ab')).toBe(true));
  it('fails one above max length', () => expect(rule.matches('abcd')).toBe(false));
  it('coerces non-string to string (123 coerces to "123", length 3 <= 3)', () => expect(rule.matches(123)).toBe(true));
  it('coerces non-string to string (1234 coerces to "1234", length 4 > 3)', () => expect(rule.matches(1234)).toBe(false));
});

// ── MinCountRule ─────────────────────────────────────────────────────────────

describe('MinCountRule', () => {
  const rule = new MinCountRule(2);
  it('passes at exactly min count', () => expect(rule.matches(['a', 'b'])).toBe(true));
  it('passes above min count', () => expect(rule.matches(['a', 'b', 'c'])).toBe(true));
  it('fails one below min count', () => expect(rule.matches(['a'])).toBe(false));
  it('fails for non-array', () => expect(rule.matches('ab')).toBe(false));
});

// ── MaxCountRule ─────────────────────────────────────────────────────────────

describe('MaxCountRule', () => {
  const rule = new MaxCountRule(2);
  it('passes at exactly max count', () => expect(rule.matches(['a', 'b'])).toBe(true));
  it('passes below max count', () => expect(rule.matches(['a'])).toBe(true));
  it('fails one above max count', () => expect(rule.matches(['a', 'b', 'c'])).toBe(false));
  it('fails for non-array', () => expect(rule.matches('ab')).toBe(false));
});

// ── IsTrueRule ───────────────────────────────────────────────────────────────

describe('IsTrueRule', () => {
  const rule = new IsTrueRule();
  it('passes for true', () => expect(rule.matches(true)).toBe(true));
  it('fails for false', () => expect(rule.matches(false)).toBe(false));
  it('fails for truthy non-boolean', () => expect(rule.matches(1)).toBe(false));
});

// ── IsFalseRule ──────────────────────────────────────────────────────────────

describe('IsFalseRule', () => {
  const rule = new IsFalseRule();
  it('passes for false', () => expect(rule.matches(false)).toBe(true));
  it('fails for true', () => expect(rule.matches(true)).toBe(false));
  it('fails for falsy non-boolean', () => expect(rule.matches(0)).toBe(false));
});

// ── EqualsFieldRule ──────────────────────────────────────────────────────────

describe('EqualsFieldRule', () => {
  const rule = new EqualsFieldRule('other');

  it('matches when value equals referenced field value', () => {
    expect(rule.matches('hello', { other: 'hello' })).toBe(true);
  });
  it('fails when value differs from referenced field value', () => {
    expect(rule.matches('hello', { other: 'world' })).toBe(false);
  });
  it('safe fallback when fieldId is absent from values map', () => {
    expect(rule.matches('hello', { unrelated: 'hello' })).toBe(false);
  });
  it('safe fallback when values map is undefined', () => {
    expect(rule.matches('hello', undefined)).toBe(false);
  });
});

// ── ComesAfterFieldRule ──────────────────────────────────────────────────────

describe('ComesAfterFieldRule', () => {
  const rule = new ComesAfterFieldRule('start');

  it('returns true when value date comes after referenced date', () => {
    expect(rule.matches('2026-06-01', { start: '2026-05-01' })).toBe(true);
  });
  it('returns false when value date comes before referenced date', () => {
    expect(rule.matches('2026-04-01', { start: '2026-05-01' })).toBe(false);
  });
  it('returns false for equal dates', () => {
    expect(rule.matches('2026-05-01', { start: '2026-05-01' })).toBe(false);
  });
  it('safe fallback when fieldId is absent', () => {
    expect(rule.matches('2026-06-01', { unrelated: '2026-05-01' })).toBe(false);
  });
  it('safe fallback when values is undefined', () => {
    expect(rule.matches('2026-06-01', undefined)).toBe(false);
  });
  it('safe fallback when value is not a string', () => {
    expect(rule.matches(20260601, { start: '2026-05-01' })).toBe(false);
  });
  it('safe fallback when referenced value is not a string', () => {
    expect(new ComesAfterFieldRule('start').matches('2026-06-01', { start: 20260501 })).toBe(false);
  });
});

// ── ComesBeforeFieldRule ─────────────────────────────────────────────────────

describe('ComesBeforeFieldRule', () => {
  const rule = new ComesBeforeFieldRule('end');

  it('returns true when value date comes before referenced date', () => {
    expect(rule.matches('2026-04-01', { end: '2026-05-01' })).toBe(true);
  });
  it('returns false when value date comes after referenced date', () => {
    expect(rule.matches('2026-06-01', { end: '2026-05-01' })).toBe(false);
  });
  it('returns false for equal dates', () => {
    expect(rule.matches('2026-05-01', { end: '2026-05-01' })).toBe(false);
  });
  it('safe fallback when fieldId is absent', () => {
    expect(rule.matches('2026-04-01', { unrelated: '2026-05-01' })).toBe(false);
  });
  it('safe fallback when values is undefined', () => {
    expect(rule.matches('2026-04-01', undefined)).toBe(false);
  });
  it('safe fallback when value is not a string', () => {
    expect(rule.matches(20260401, { end: '2026-05-01' })).toBe(false);
  });
  it('safe fallback when referenced value is not a string', () => {
    expect(new ComesBeforeFieldRule('start').matches('2026-06-01', { start: 20260501 })).toBe(false);
  });
});

// ── RequiredRule (imported directly from rule.ts, not from index.ts) ─────────

describe('RequiredRule', () => {
  it('checkbox always matches regardless of value', () => {
    const rule = new RequiredRule('checkbox');
    expect(rule.matches(false)).toBe(true);
    expect(rule.matches(true)).toBe(true);
  });
  it('fails for empty string', () => {
    expect(new RequiredRule('text').matches('')).toBe(false);
  });
  it('fails for null', () => {
    expect(new RequiredRule('text').matches(null)).toBe(false);
  });
  it('passes for non-empty string', () => {
    expect(new RequiredRule('text').matches('hello')).toBe(true);
  });
  it('fails for empty array', () => {
    expect(new RequiredRule('multi-select').matches([])).toBe(false);
  });
  it('passes for non-empty array', () => {
    expect(new RequiredRule('multi-select').matches(['a'])).toBe(true);
  });
  it('returns correct error message', () => {
    expect(new RequiredRule('text').errorMessage()).toBe('This field is required');
  });
  it('fails for undefined on string field', () => {
    expect(new RequiredRule('text').matches(undefined)).toBe(false);
  });
  it('fails for undefined on array field', () => {
    expect(new RequiredRule('multi-select').matches(undefined)).toBe(false);
  });
});

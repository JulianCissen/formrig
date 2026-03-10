import { getEffectiveRules } from '../validation-utils';
import {
  RequiredRule,
  MinLengthRule,
  MaxLengthRule,
  MatchesPatternRule,
  MinCountRule,
  MaxCountRule,
  EqualsRule,
  MinValueRule,
  MaxValueRule,
} from '../rule';
import type { FieldDto } from '../form-definition-dto';

// ── helpers ──────────────────────────────────────────────────────────────────

const ctx = {};

// ── 1. Empty field — no rules, no required, no shorthands ───────────────────

describe('getEffectiveRules — empty field', () => {
  it('returns [] for a bare text field with no rules or shorthands', () => {
    const field: FieldDto = {
      id: 'f1', type: 'text', label: 'Test', required: false, disabled: false,
    };
    expect(getEffectiveRules(field, ctx)).toEqual([]);
  });
});

// ── 2. required = true, type = 'text' → RequiredRule is first ───────────────

describe('getEffectiveRules — required text field', () => {
  const field: FieldDto = {
    id: 'f1', type: 'text', label: 'Test', required: true, disabled: false,
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns at least one rule', () => expect(rules.length).toBeGreaterThan(0));
  it('first rule is a RequiredRule instance', () => expect(rules[0]).toBeInstanceOf(RequiredRule));
  it('RequiredRule fails on null (empty string / null treated as no value)', () => {
    expect(rules[0].matches(null)).toBe(false);
  });
  it('RequiredRule passes on a non-empty string', () => {
    expect(rules[0].matches('hi')).toBe(true);
  });
  it('RequiredRule fails on empty string', () => {
    expect(rules[0].matches('')).toBe(false);
  });
});

// ── 3. required = true, type = 'checkbox' → NO RequiredRule ─────────────────

describe('getEffectiveRules — required checkbox field', () => {
  it('returns [] — checkbox required flag is ignored', () => {
    const field: FieldDto = {
      id: 'f1', type: 'checkbox', label: 'Test', required: true, disabled: false,
    };
    expect(getEffectiveRules(field, ctx)).toEqual([]);
  });
});

// ── 4. type = 'text', maxCharacters = 5 → MaxLengthRule ─────────────────────

describe('getEffectiveRules — text field with maxCharacters', () => {
  const field: FieldDto = {
    id: 'f1', type: 'text', label: 'Test', required: false, disabled: false,
    maxCharacters: 5,
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly one rule', () => expect(rules.length).toBe(1));
  it('rule is a MaxLengthRule', () => expect(rules[0]).toBeInstanceOf(MaxLengthRule));
  it('fails for a string exceeding max (6 chars)', () => expect(rules[0].matches('toolon')).toBe(false));
  it('passes for a short string (2 chars)', () => expect(rules[0].matches('ok')).toBe(true));
  it('passes for exactly 5 chars', () => expect(rules[0].matches('hello')).toBe(true));
});

// ── 5. type = 'text', minCharacters = 3, pattern = '^\\d+$' ─────────────────

describe('getEffectiveRules — text field with minCharacters + pattern', () => {
  const field: FieldDto = {
    id: 'f1', type: 'text', label: 'Test', required: false, disabled: false,
    minCharacters: 3,
    pattern: '^\\d+$',
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly 2 rules', () => expect(rules.length).toBe(2));
  it('first rule is MinLengthRule', () => expect(rules[0]).toBeInstanceOf(MinLengthRule));
  it('second rule is MatchesPatternRule', () => expect(rules[1]).toBeInstanceOf(MatchesPatternRule));
  it('MinLengthRule fails on "ab" (2 chars)', () => expect(rules[0].matches('ab')).toBe(false));
  it('MinLengthRule passes on "abc" (3 chars)', () => expect(rules[0].matches('abc')).toBe(true));
  it('MatchesPatternRule passes on "123"', () => expect(rules[1].matches('123')).toBe(true));
  it('MatchesPatternRule fails on "abc"', () => expect(rules[1].matches('abc')).toBe(false));
});

// ── 6. type = 'textarea', maxCharacters = 10 → MaxLengthRule ────────────────

describe('getEffectiveRules — textarea with maxCharacters', () => {
  const field: FieldDto = {
    id: 'f1', type: 'textarea', label: 'Test', required: false, disabled: false,
    maxCharacters: 10,
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly one rule', () => expect(rules.length).toBe(1));
  it('rule is MaxLengthRule', () => expect(rules[0]).toBeInstanceOf(MaxLengthRule));
  it('passes for string of length 10', () => expect(rules[0].matches('0123456789')).toBe(true));
  it('fails for string of length 11', () => expect(rules[0].matches('01234567890')).toBe(false));
});

// ── 7. type = 'multi-select', minSelected = 2, maxSelected = 4 ──────────────

describe('getEffectiveRules — multi-select with minSelected + maxSelected', () => {
  const field: FieldDto = {
    id: 'f1', type: 'multi-select', label: 'Test', required: false, disabled: false,
    options: ['a', 'b', 'c', 'd', 'e'],
    minSelected: 2,
    maxSelected: 4,
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly 2 rules', () => expect(rules.length).toBe(2));
  it('first rule is MinCountRule', () => expect(rules[0]).toBeInstanceOf(MinCountRule));
  it('second rule is MaxCountRule', () => expect(rules[1]).toBeInstanceOf(MaxCountRule));
  it('MinCountRule fails on single-item array', () => expect(rules[0].matches(['a'])).toBe(false));
  it('MinCountRule passes on two-item array', () => expect(rules[0].matches(['a', 'b'])).toBe(true));
  it('MaxCountRule passes on four-item array', () => expect(rules[1].matches(['a', 'b', 'c', 'd'])).toBe(true));
  it('MaxCountRule fails on five-item array', () => expect(rules[1].matches(['a', 'b', 'c', 'd', 'e'])).toBe(false));
});

// ── 8. field.rules = [{ type: 'equals', expected: 'hello' }] → EqualsRule ───

describe('getEffectiveRules — generic rules[] appended', () => {
  const field: FieldDto = {
    id: 'f1', type: 'text', label: 'Test', required: false, disabled: false,
    rules: [{ type: 'equals', expected: 'hello' }],
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly one rule', () => expect(rules.length).toBe(1));
  it('rule is an EqualsRule instance', () => expect(rules[0]).toBeInstanceOf(EqualsRule));
  it('passes for "hello"', () => expect(rules[0].matches('hello')).toBe(true));
  it('fails for "world"', () => expect(rules[0].matches('world')).toBe(false));
});

// ── 9. Order: RequiredRule first, then shorthands, then rules[] ──────────────

describe('getEffectiveRules — rule ordering', () => {
  const field: FieldDto = {
    id: 'f1', type: 'text', label: 'Test', required: true, disabled: false,
    minCharacters: 2,
    maxCharacters: 10,
    pattern: '^\\w+$',
    rules: [{ type: 'equals', expected: 'hello' }],
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns 5 rules total', () => expect(rules.length).toBe(5));
  it('index 0 — RequiredRule', () => expect(rules[0]).toBeInstanceOf(RequiredRule));
  it('index 1 — MinLengthRule (shorthand)', () => expect(rules[1]).toBeInstanceOf(MinLengthRule));
  it('index 2 — MaxLengthRule (shorthand)', () => expect(rules[2]).toBeInstanceOf(MaxLengthRule));
  it('index 3 — MatchesPatternRule (shorthand)', () => expect(rules[3]).toBeInstanceOf(MatchesPatternRule));
  it('index 4 — EqualsRule (from rules[])', () => expect(rules[4]).toBeInstanceOf(EqualsRule));
});

// ── 10. type = 'select', required = true → RequiredRule added ───────────────

describe('getEffectiveRules — select field with required', () => {
  const field: FieldDto = {
    id: 'f1', type: 'select', label: 'Test', required: true, disabled: false,
    options: ['a', 'b'],
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly one rule', () => expect(rules.length).toBe(1));
  it('rule is RequiredRule', () => expect(rules[0]).toBeInstanceOf(RequiredRule));
  it('RequiredRule fails on null', () => expect(rules[0].matches(null)).toBe(false));
  it('RequiredRule passes on a non-null value', () => expect(rules[0].matches('a')).toBe(true));
});

// ── 11. type = 'radio', required = true → RequiredRule added ────────────────

describe('getEffectiveRules — radio field with required', () => {
  const field: FieldDto = {
    id: 'f1', type: 'radio', label: 'Test', required: true, disabled: false,
    options: ['yes', 'no'],
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly one rule', () => expect(rules.length).toBe(1));
  it('rule is RequiredRule', () => expect(rules[0]).toBeInstanceOf(RequiredRule));
  it('RequiredRule fails on null', () => expect(rules[0].matches(null)).toBe(false));
  it('RequiredRule passes on a selected option', () => expect(rules[0].matches('yes')).toBe(true));
});

// ── 12. type = 'number', min + max shorthands ───────────────────────────

describe('getEffectiveRules — number field with min and max shorthands', () => {
  const field: FieldDto = {
    id: 'n1', type: 'number', label: 'Age', required: false, disabled: false,
    value: null, min: 0, max: 120,
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly 2 rules', () => expect(rules.length).toBe(2));
  it('first rule is MinValueRule', () => expect(rules[0]).toBeInstanceOf(MinValueRule));
  it('second rule is MaxValueRule', () => expect(rules[1]).toBeInstanceOf(MaxValueRule));
  it('MinValueRule fails below bound', () => expect(rules[0].matches(-1)).toBe(false));
  it('MinValueRule passes at bound', () => expect(rules[0].matches(0)).toBe(true));
  it('MaxValueRule passes at bound', () => expect(rules[1].matches(120)).toBe(true));
  it('MaxValueRule fails above bound', () => expect(rules[1].matches(121)).toBe(false));
});

// ── 13. type = 'number', only min ───────────────────────────────────────────

describe('getEffectiveRules — number field with only min shorthand', () => {
  const field: FieldDto = {
    id: 'n2', type: 'number', label: 'Score', required: false, disabled: false,
    value: null, min: 1,
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly 1 rule', () => expect(rules.length).toBe(1));
  it('rule is MinValueRule', () => expect(rules[0]).toBeInstanceOf(MinValueRule));
  it('passes for value at bound', () => expect(rules[0].matches(1)).toBe(true));
  it('fails for value below bound', () => expect(rules[0].matches(0)).toBe(false));
});

// ── 14. type = 'number', only max ───────────────────────────────────────────

describe('getEffectiveRules — number field with only max shorthand', () => {
  const field: FieldDto = {
    id: 'n3', type: 'number', label: 'Percent', required: false, disabled: false,
    value: null, max: 100,
  };
  const rules = getEffectiveRules(field, ctx);

  it('returns exactly 1 rule', () => expect(rules.length).toBe(1));
  it('rule is MaxValueRule', () => expect(rules[0]).toBeInstanceOf(MaxValueRule));
  it('passes for value at bound', () => expect(rules[0].matches(100)).toBe(true));
  it('fails for value above bound', () => expect(rules[0].matches(101)).toBe(false));
});

// ── 15. type = 'number', neither min nor max ──────────────────────────────

describe('getEffectiveRules — number field with no shorthands', () => {
  it('returns [] for a bare number field', () => {
    const field: FieldDto = {
      id: 'n4', type: 'number', label: 'Count', required: false, disabled: false,
      value: null,
    };
    expect(getEffectiveRules(field, ctx)).toEqual([]);
  });
});

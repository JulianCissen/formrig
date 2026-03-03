import { evaluateConditionTree } from '../condition-tree';
import { ruleFromDto, type RuleDto } from '../rule-dto';

// ── evaluateConditionTree ────────────────────────────────────────────────────

describe('evaluateConditionTree — single leaf', () => {
  const leafEquals = { fieldId: 'f1', rule: { type: 'equals' as const, expected: 'a' } };

  it('matches when value equals expected', () => {
    expect(evaluateConditionTree(leafEquals, { f1: 'a' })).toBe(true);
  });

  it('does not match when value differs', () => {
    expect(evaluateConditionTree(leafEquals, { f1: 'b' })).toBe(false);
  });

  it('does not match when value is missing (null substituted)', () => {
    // null !== 'a'
    expect(evaluateConditionTree(leafEquals, {})).toBe(false);
  });
});

describe('evaluateConditionTree — AND group', () => {
  const leaf1 = { fieldId: 'f1', rule: { type: 'equals' as const, expected: 'yes' } };
  const leaf2 = { fieldId: 'f2', rule: { type: 'equals' as const, expected: 42 } };
  const andTree = { operator: 'AND' as const, children: [leaf1, leaf2] };

  it('returns true when all children match', () => {
    expect(evaluateConditionTree(andTree, { f1: 'yes', f2: 42 })).toBe(true);
  });

  it('returns false when one child does not match', () => {
    expect(evaluateConditionTree(andTree, { f1: 'yes', f2: 99 })).toBe(false);
  });
});

describe('evaluateConditionTree — OR group', () => {
  const leaf1 = { fieldId: 'f1', rule: { type: 'equals' as const, expected: 'yes' } };
  const leaf2 = { fieldId: 'f2', rule: { type: 'equals' as const, expected: 'yes' } };
  const orTree = { operator: 'OR' as const, children: [leaf1, leaf2] };

  it('returns true when one child matches', () => {
    expect(evaluateConditionTree(orTree, { f1: 'yes', f2: 'no' })).toBe(true);
  });

  it('returns false when no children match', () => {
    expect(evaluateConditionTree(orTree, { f1: 'no', f2: 'no' })).toBe(false);
  });
});

describe('evaluateConditionTree — XOR group', () => {
  const leaf1 = { fieldId: 'f1', rule: { type: 'equals' as const, expected: 'yes' } };
  const leaf2 = { fieldId: 'f2', rule: { type: 'equals' as const, expected: 'yes' } };
  const xorTree = { operator: 'XOR' as const, children: [leaf1, leaf2] };

  it('returns true when exactly one child matches', () => {
    expect(evaluateConditionTree(xorTree, { f1: 'yes', f2: 'no' })).toBe(true);
  });

  it('returns false when both children match', () => {
    expect(evaluateConditionTree(xorTree, { f1: 'yes', f2: 'yes' })).toBe(false);
  });

  it('returns false when neither child matches', () => {
    expect(evaluateConditionTree(xorTree, { f1: 'no', f2: 'no' })).toBe(false);
  });
});

describe('evaluateConditionTree — nested group', () => {
  // AND( leaf(f1 == 'yes'), OR( leaf(f2 == 'a'), leaf(f3 == 'b') ) )
  const leaf1 = { fieldId: 'f1', rule: { type: 'equals' as const, expected: 'yes' } };
  const leaf2 = { fieldId: 'f2', rule: { type: 'equals' as const, expected: 'a' } };
  const leaf3 = { fieldId: 'f3', rule: { type: 'equals' as const, expected: 'b' } };
  const orGroup = { operator: 'OR' as const, children: [leaf2, leaf3] };
  const andTree = { operator: 'AND' as const, children: [leaf1, orGroup] };

  it('returns true when AND leaf matches and OR sub-group has at least one match', () => {
    expect(evaluateConditionTree(andTree, { f1: 'yes', f2: 'a', f3: 'x' })).toBe(true);
  });

  it('returns false when AND leaf does not match even if OR is satisfied', () => {
    expect(evaluateConditionTree(andTree, { f1: 'no', f2: 'a', f3: 'x' })).toBe(false);
  });

  it('returns false when OR sub-group is not satisfied even if AND leaf matches', () => {
    expect(evaluateConditionTree(andTree, { f1: 'yes', f2: 'x', f3: 'x' })).toBe(false);
  });
});

describe('evaluateConditionTree — cross-field rule (equals-field)', () => {
  const leaf = {
    fieldId: 'confirm',
    rule: { type: 'equals-field' as const, fieldId: 'email' },
  };

  it('returns true when confirm matches email', () => {
    expect(evaluateConditionTree(leaf, { email: 'a@b.com', confirm: 'a@b.com' })).toBe(true);
  });

  it('returns false when confirm does not match email', () => {
    expect(evaluateConditionTree(leaf, { email: 'a@b.com', confirm: 'x@b.com' })).toBe(false);
  });
});

// ── ruleFromDto ──────────────────────────────────────────────────────────────

describe('ruleFromDto — round-trip: produces instance with correct .type for all 15 variants', () => {
  const cases: RuleDto[] = [
    { type: 'equals',             expected: 'x' },
    { type: 'not-equals',         expected: 'x' },
    { type: 'is-empty' },
    { type: 'is-not-empty' },
    { type: 'contains',           substring: 'foo' },
    { type: 'matches-pattern',    pattern: '^\\d+$' },
    { type: 'min-length',         min: 1 },
    { type: 'max-length',         max: 10 },
    { type: 'min-count',          min: 1 },
    { type: 'max-count',          max: 5 },
    { type: 'is-true' },
    { type: 'is-false' },
    { type: 'equals-field',       fieldId: 'other' },
    { type: 'comes-after-field',  fieldId: 'start' },
    { type: 'comes-before-field', fieldId: 'end' },
  ];

  it.each(cases)('ruleFromDto({ type: "$type" }).type === "$type"', (dto) => {
    expect(ruleFromDto(dto).type).toBe(dto.type);
  });
});

describe('ruleFromDto — factory produces correct instances', () => {
  it('EqualsRule matches its expected value', () => {
    const rule = ruleFromDto({ type: 'equals', expected: 99 });
    expect(rule.matches(99)).toBe(true);
    expect(rule.matches(100)).toBe(false);
  });

  it('ContainsRule matches substring', () => {
    const rule = ruleFromDto({ type: 'contains', substring: 'hello' });
    expect(rule.matches('say hello world')).toBe(true);
    expect(rule.matches('goodbye')).toBe(false);
  });

  it('MinLengthRule enforces minimum', () => {
    const rule = ruleFromDto({ type: 'min-length', min: 5 });
    expect(rule.matches('abcde')).toBe(true);
    expect(rule.matches('ab')).toBe(false);
  });

  it('EqualsFieldRule compares against values map', () => {
    const rule = ruleFromDto({ type: 'equals-field', fieldId: 'target' });
    expect(rule.matches('foo', { target: 'foo' })).toBe(true);
    expect(rule.matches('foo', { target: 'bar' })).toBe(false);
  });

  it('IsTrueRule matches only true', () => {
    const rule = ruleFromDto({ type: 'is-true' });
    expect(rule.matches(true)).toBe(true);
    expect(rule.matches(false)).toBe(false);
    expect(rule.matches(1)).toBe(false);
  });
});

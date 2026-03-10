import { RuleDtoSchema, ruleFromDto } from '../rule-dto';
import { MinValueRule, MaxValueRule } from '../rule';

// ── RuleDtoSchema — min-value ─────────────────────────────────────────────────

describe('RuleDtoSchema — min-value', () => {
  it('parses a valid min-value DTO', () => {
    expect(RuleDtoSchema.safeParse({ type: 'min-value', min: 5 }).success).toBe(true);
  });

  it('parses with optional message field', () => {
    const result = RuleDtoSchema.safeParse({ type: 'min-value', min: 5, message: 'At least 5' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe('At least 5');
  });

  it('rejects float min value', () => {
    expect(RuleDtoSchema.safeParse({ type: 'min-value', min: 1.5 }).success).toBe(false);
  });

  it('accepts zero as min value', () => {
    expect(RuleDtoSchema.safeParse({ type: 'min-value', min: 0 }).success).toBe(true);
  });

  it('accepts negative integer min value', () => {
    expect(RuleDtoSchema.safeParse({ type: 'min-value', min: -10 }).success).toBe(true);
  });

  it('rejects missing min field', () => {
    expect(RuleDtoSchema.safeParse({ type: 'min-value' }).success).toBe(false);
  });
});

// ── RuleDtoSchema — max-value ─────────────────────────────────────────────────

describe('RuleDtoSchema — max-value', () => {
  it('parses a valid max-value DTO', () => {
    expect(RuleDtoSchema.safeParse({ type: 'max-value', max: 10 }).success).toBe(true);
  });

  it('parses with optional message field', () => {
    const result = RuleDtoSchema.safeParse({ type: 'max-value', max: 10, message: 'At most 10' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe('At most 10');
  });

  it('rejects float max value', () => {
    expect(RuleDtoSchema.safeParse({ type: 'max-value', max: 1.5 }).success).toBe(false);
  });

  it('accepts zero as max value', () => {
    expect(RuleDtoSchema.safeParse({ type: 'max-value', max: 0 }).success).toBe(true);
  });

  it('accepts negative integer max value', () => {
    expect(RuleDtoSchema.safeParse({ type: 'max-value', max: -1 }).success).toBe(true);
  });

  it('rejects missing max field', () => {
    expect(RuleDtoSchema.safeParse({ type: 'max-value' }).success).toBe(false);
  });
});

// ── ruleFromDto — min-value round-trip ───────────────────────────────────────

describe('ruleFromDto — min-value round-trip', () => {
  it('returns a MinValueRule instance', () => {
    expect(ruleFromDto({ type: 'min-value', min: 3 })).toBeInstanceOf(MinValueRule);
  });

  it('passes at the bound (value === min)', () => {
    expect(ruleFromDto({ type: 'min-value', min: 3 }).matches(3)).toBe(true);
  });

  it('passes above the bound', () => {
    expect(ruleFromDto({ type: 'min-value', min: 3 }).matches(10)).toBe(true);
  });

  it('fails below the bound', () => {
    expect(ruleFromDto({ type: 'min-value', min: 3 }).matches(2)).toBe(false);
  });

  it('custom message overrides default errorMessage()', () => {
    const rule = ruleFromDto({ type: 'min-value', min: 3, message: 'Too small' });
    expect(rule.errorMessage()).toBe('Too small');
  });

  it('default errorMessage() when no custom message', () => {
    expect(ruleFromDto({ type: 'min-value', min: 3 }).errorMessage()).toBe('Must be at least 3');
  });
});

// ── ruleFromDto — max-value round-trip ───────────────────────────────────────

describe('ruleFromDto — max-value round-trip', () => {
  it('returns a MaxValueRule instance', () => {
    expect(ruleFromDto({ type: 'max-value', max: 10 })).toBeInstanceOf(MaxValueRule);
  });

  it('passes at the bound (value === max)', () => {
    expect(ruleFromDto({ type: 'max-value', max: 10 }).matches(10)).toBe(true);
  });

  it('passes below the bound', () => {
    expect(ruleFromDto({ type: 'max-value', max: 10 }).matches(5)).toBe(true);
  });

  it('fails above the bound', () => {
    expect(ruleFromDto({ type: 'max-value', max: 10 }).matches(11)).toBe(false);
  });

  it('custom message overrides default errorMessage()', () => {
    const rule = ruleFromDto({ type: 'max-value', max: 10, message: 'Too large' });
    expect(rule.errorMessage()).toBe('Too large');
  });

  it('default errorMessage() when no custom message', () => {
    expect(ruleFromDto({ type: 'max-value', max: 10 }).errorMessage()).toBe('Must be at most 10');
  });
});

import { isSafePattern } from './regex-safety';

export abstract class Rule {
  abstract readonly type: string;
  /** Optional custom override for the violation message. Set via withMessage(). */
  message?: string;
  /** Fluent helper — sets a custom error message and returns this instance. */
  withMessage(msg: string): this { this.message = msg; return this; }
  /** Returns true when the value satisfies the rule. */
  abstract matches(value: unknown, values?: Record<string, unknown>): boolean;
  /** Returns the effective error message: custom message if set, otherwise the rule default. */
  errorMessage(): string { return this.message ?? this.defaultErrorMessage(); }
  /** Per-rule default violation message. Override in each concrete subclass. */
  protected abstract defaultErrorMessage(): string;
}

// ── Simple equality ──────────────────────────────────────────────────────────

export class EqualsRule extends Rule {
  readonly type = 'equals' as const;
  private readonly expected: unknown;
  constructor({ expected }: { expected: unknown }) { super(); this.expected = expected; }
  matches(value: unknown): boolean { return value === this.expected; }
  protected defaultErrorMessage(): string { return `Must equal ${String(this.expected)}`; }
}

export class NotEqualsRule extends Rule {
  readonly type = 'not-equals' as const;
  private readonly expected: unknown;
  constructor({ expected }: { expected: unknown }) { super(); this.expected = expected; }
  matches(value: unknown): boolean { return value !== this.expected; }
  protected defaultErrorMessage(): string { return `Must not equal ${String(this.expected)}`; }
}

// ── Emptiness ────────────────────────────────────────────────────────────────

export class IsEmptyRule extends Rule {
  readonly type = 'is-empty' as const;
  matches(value: unknown): boolean {
    return (
      value === '' ||
      value === false ||
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0)
    );
  }
  protected defaultErrorMessage(): string { return 'Must be empty'; }
}

export class IsNotEmptyRule extends Rule {
  readonly type = 'is-not-empty' as const;
  matches(value: unknown): boolean { return !new IsEmptyRule().matches(value); }
  protected defaultErrorMessage(): string { return 'Must not be empty'; }
}

// ── String / array checks ────────────────────────────────────────────────────

export class ContainsRule extends Rule {
  readonly type = 'contains' as const;
  private readonly substring: string;
  constructor({ substring }: { substring: string }) { super(); this.substring = substring; }
  matches(value: unknown): boolean {
    if (typeof value === 'string') return value.includes(this.substring);
    if (Array.isArray(value)) return value.includes(this.substring);
    return false;
  }
  protected defaultErrorMessage(): string { return `Must contain "${this.substring}"`; }
}

export class MatchesPatternRule extends Rule {
  readonly type = 'matches-pattern' as const;
  private readonly pattern: string;
  private readonly regex: RegExp;
  /**
   * @param pattern A valid regex pattern string.
   * @throws {SyntaxError} When the provided pattern is not a valid regular expression.
   * @throws {Error} When the provided pattern is rejected as potentially unsafe (ReDoS risk).
   */
  constructor({ pattern }: { pattern: string }) {
    super();
    if (!isSafePattern(pattern)) {
      throw new Error(`Pattern '${pattern}' was rejected as potentially unsafe (ReDoS risk).`);
    }
    this.regex = new RegExp(pattern);  // throws SyntaxError on invalid pattern
    this.pattern = pattern;
  }
  matches(value: unknown): boolean {
    return this.regex.test(String(value));
  }
  protected defaultErrorMessage(): string { return `Must match pattern ${this.pattern}`; }
}

export class MinLengthRule extends Rule {
  readonly type = 'min-length' as const;
  private readonly min: number;
  constructor({ min }: { min: number }) { super(); this.min = min; }
  matches(value: unknown): boolean {
    return String(value ?? '').length >= this.min;
  }
  protected defaultErrorMessage(): string { return `Must be at least ${this.min} character(s)`; }
}

export class MaxLengthRule extends Rule {
  readonly type = 'max-length' as const;
  private readonly max: number;
  constructor({ max }: { max: number }) { super(); this.max = max; }
  matches(value: unknown): boolean {
    return String(value ?? '').length <= this.max;
  }
  protected defaultErrorMessage(): string { return `Must be at most ${this.max} character(s)`; }
}

// ── Array count checks ───────────────────────────────────────────────────────

export class MinCountRule extends Rule {
  readonly type = 'min-count' as const;
  private readonly min: number;
  constructor({ min }: { min: number }) { super(); this.min = min; }
  matches(value: unknown): boolean {
    return Array.isArray(value) && value.length >= this.min;
  }
  protected defaultErrorMessage(): string { return `Must have at least ${this.min} item(s)`; }
}

export class MaxCountRule extends Rule {
  readonly type = 'max-count' as const;
  private readonly max: number;
  constructor({ max }: { max: number }) { super(); this.max = max; }
  matches(value: unknown): boolean {
    return Array.isArray(value) && value.length <= this.max;
  }
  protected defaultErrorMessage(): string { return `Must have at most ${this.max} item(s)`; }
}

// ── Boolean checks ───────────────────────────────────────────────────────────

export class IsTrueRule extends Rule {
  readonly type = 'is-true' as const;
  matches(value: unknown): boolean { return value === true; }
  protected defaultErrorMessage(): string { return 'Must be true'; }
}

export class IsFalseRule extends Rule {
  readonly type = 'is-false' as const;
  matches(value: unknown): boolean { return value === false; }
  protected defaultErrorMessage(): string { return 'Must be false'; }
}

// ── Cross-field rules ────────────────────────────────────────────────────────

export class EqualsFieldRule extends Rule {
  readonly type = 'equals-field' as const;
  private readonly fieldId: string;
  constructor({ fieldId }: { fieldId: string }) { super(); this.fieldId = fieldId; }
  matches(value: unknown, values?: Record<string, unknown>): boolean {
    return values !== undefined && this.fieldId in values
      ? value === values[this.fieldId]
      : false;
  }
  protected defaultErrorMessage(): string { return `Must equal the value of field "${this.fieldId}"`; }
}

export class ComesAfterFieldRule extends Rule {
  readonly type = 'comes-after-field' as const;
  private readonly fieldId: string;
  constructor({ fieldId }: { fieldId: string }) { super(); this.fieldId = fieldId; }
  matches(value: unknown, values?: Record<string, unknown>): boolean {
    if (
      values === undefined ||
      !(this.fieldId in values) ||
      typeof value !== 'string' ||
      typeof values[this.fieldId] !== 'string'
    ) {
      return false;
    }
    const a = new Date(value as string);
    const b = new Date(values[this.fieldId] as string);
    return a > b;
  }
  protected defaultErrorMessage(): string { return `Must come after field "${this.fieldId}"`; }
}

export class ComesBeforeFieldRule extends Rule {
  readonly type = 'comes-before-field' as const;
  private readonly fieldId: string;
  constructor({ fieldId }: { fieldId: string }) { super(); this.fieldId = fieldId; }
  matches(value: unknown, values?: Record<string, unknown>): boolean {
    if (
      values === undefined ||
      !(this.fieldId in values) ||
      typeof value !== 'string' ||
      typeof values[this.fieldId] !== 'string'
    ) {
      return false;
    }
    const a = new Date(value as string);
    const b = new Date(values[this.fieldId] as string);
    return a < b;
  }
  protected defaultErrorMessage(): string { return `Must come before field "${this.fieldId}"`; }
}

// ── Date rules ──────────────────────────────────────────────────────────────

export class OlderThanRule extends Rule {
  readonly type = 'older-than' as const;
  private readonly years: number;
  constructor({ years }: { years: number }) { super(); this.years = years; }

  matches(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const [y, m, d] = (value as string).split('-').map(Number);
    if (!y || !m || !d) return false;
    const dob = new Date(y, m - 1, d); // local date, not UTC
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
    return age >= this.years;
  }

  protected defaultErrorMessage(): string {
    return `Must be ${this.years} years old or older`;
  }
}

export class YoungerThanRule extends Rule {
  readonly type = 'younger-than' as const;
  private readonly years: number;
  constructor({ years }: { years: number }) { super(); this.years = years; }

  matches(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const [y, m, d] = (value as string).split('-').map(Number);
    if (!y || !m || !d) return false;
    const dob = new Date(y, m - 1, d);
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
    return age < this.years;
  }

  protected defaultErrorMessage(): string {
    return `Must be younger than ${this.years} years old`;
  }
}

export class BeforeStaticDateRule extends Rule {
  readonly type = 'before-static-date' as const;
  private readonly date: string;
  constructor({ date }: { date: string }) { super(); this.date = date; }

  matches(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const [vy, vm, vd] = (value as string).split('-').map(Number);
    const [ty, tm, td] = this.date.split('-').map(Number);
    if (!vy || !vm || !vd || !ty || !tm || !td) return false;
    const v = new Date(vy, vm - 1, vd);
    const t = new Date(ty, tm - 1, td);
    if (isNaN(v.getTime()) || isNaN(t.getTime())) return false;
    return v < t;
  }

  protected defaultErrorMessage(): string {
    return `Must be before ${this.date}`;
  }
}

export class AfterStaticDateRule extends Rule {
  readonly type = 'after-static-date' as const;
  private readonly date: string;
  constructor({ date }: { date: string }) { super(); this.date = date; }

  matches(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const [vy, vm, vd] = (value as string).split('-').map(Number);
    const [ty, tm, td] = this.date.split('-').map(Number);
    if (!vy || !vm || !vd || !ty || !tm || !td) return false;
    const v = new Date(vy, vm - 1, vd);
    const t = new Date(ty, tm - 1, td);
    if (isNaN(v.getTime()) || isNaN(t.getTime())) return false;
    return v > t;
  }

  protected defaultErrorMessage(): string {
    return `Must be after ${this.date}`;
  }
}

// ── Internal — NOT re-exported from index.ts ─────────────────────────────────

/**
 * Virtual rule used internally by getEffectiveRules.
 * Exported from rule.ts so that validation-utils can import it directly,
 * but intentionally absent from packages/shared/src/index.ts.
 */
export class RequiredRule extends Rule {
  readonly type = 'required' as const;
  private readonly fieldType: string;
  constructor({ fieldType }: { fieldType: string }) { super(); this.fieldType = fieldType; }
  matches(value: unknown): boolean {
    if (this.fieldType === 'checkbox') return true; // checkbox cannot be required
    if (Array.isArray(value)) return value.length > 0; // string[]
    return value != null && value !== ''; // string — `!= null` catches both null and undefined
  }
  protected defaultErrorMessage(): string { return 'This field is required'; }
}

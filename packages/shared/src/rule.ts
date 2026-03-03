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
  constructor(private readonly expected: unknown) { super(); }
  matches(value: unknown): boolean { return value === this.expected; }
  protected defaultErrorMessage(): string { return `Must equal ${String(this.expected)}`; }
}

export class NotEqualsRule extends Rule {
  readonly type = 'not-equals' as const;
  constructor(private readonly expected: unknown) { super(); }
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
  constructor(private readonly substring: string) { super(); }
  matches(value: unknown): boolean {
    if (typeof value === 'string') return value.includes(this.substring);
    if (Array.isArray(value)) return value.includes(this.substring);
    return false;
  }
  protected defaultErrorMessage(): string { return `Must contain "${this.substring}"`; }
}

export class MatchesPatternRule extends Rule {
  readonly type = 'matches-pattern' as const;
  private readonly regex: RegExp;
  /**
   * @param pattern A valid regex pattern string.
   * @throws {SyntaxError} When the provided pattern is not a valid regular expression.
   * @throws {Error} When the provided pattern is rejected as potentially unsafe (ReDoS risk).
   */
  constructor(private readonly pattern: string) {
    super();
    if (!isSafePattern(pattern)) {
      throw new Error(`Pattern '${pattern}' was rejected as potentially unsafe (ReDoS risk).`);
    }
    this.regex = new RegExp(pattern);  // throws SyntaxError on invalid pattern
  }
  matches(value: unknown): boolean {
    return this.regex.test(String(value));
  }
  protected defaultErrorMessage(): string { return `Must match pattern ${this.pattern}`; }
}

export class MinLengthRule extends Rule {
  readonly type = 'min-length' as const;
  constructor(private readonly min: number) { super(); }
  matches(value: unknown): boolean {
    return String(value ?? '').length >= this.min;
  }
  protected defaultErrorMessage(): string { return `Must be at least ${this.min} character(s)`; }
}

export class MaxLengthRule extends Rule {
  readonly type = 'max-length' as const;
  constructor(private readonly max: number) { super(); }
  matches(value: unknown): boolean {
    return String(value ?? '').length <= this.max;
  }
  protected defaultErrorMessage(): string { return `Must be at most ${this.max} character(s)`; }
}

// ── Array count checks ───────────────────────────────────────────────────────

export class MinCountRule extends Rule {
  readonly type = 'min-count' as const;
  constructor(private readonly min: number) { super(); }
  matches(value: unknown): boolean {
    return Array.isArray(value) && value.length >= this.min;
  }
  protected defaultErrorMessage(): string { return `Must have at least ${this.min} item(s)`; }
}

export class MaxCountRule extends Rule {
  readonly type = 'max-count' as const;
  constructor(private readonly max: number) { super(); }
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
  constructor(private readonly fieldId: string) { super(); }
  matches(value: unknown, values?: Record<string, unknown>): boolean {
    return values !== undefined && this.fieldId in values
      ? value === values[this.fieldId]
      : false;
  }
  protected defaultErrorMessage(): string { return `Must equal the value of field "${this.fieldId}"`; }
}

export class ComesAfterFieldRule extends Rule {
  readonly type = 'comes-after-field' as const;
  constructor(private readonly fieldId: string) { super(); }
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
  constructor(private readonly fieldId: string) { super(); }
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

// ── Internal — NOT re-exported from index.ts ─────────────────────────────────

/**
 * Virtual rule used internally by getEffectiveRules.
 * Exported from rule.ts so that validation-utils can import it directly,
 * but intentionally absent from packages/shared/src/index.ts.
 */
export class RequiredRule extends Rule {
  readonly type = 'required' as const;
  constructor(private readonly fieldType: string) { super(); }
  matches(value: unknown): boolean {
    if (this.fieldType === 'checkbox') return true; // checkbox cannot be required
    if (Array.isArray(value)) return value.length > 0; // string[]
    return value != null && value !== ''; // string — `!= null` catches both null and undefined
  }
  protected defaultErrorMessage(): string { return 'This field is required'; }
}

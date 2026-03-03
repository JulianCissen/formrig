import { BadRequestException } from '@nestjs/common';
import { hardValidate } from '../hard-validate.util';
import { FieldDto } from '@formrig/shared';
import { STRUCTURAL_FIELDS } from '../dto/update-form-values.dto';

// ── Helpers to build minimal FieldDto fixtures ───────────────────────────────

const textField = (overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'name-0',
    type: 'text',
    label: 'Name',
    required: false,
    disabled: false,
    value: '',
    ...overrides,
  }) as FieldDto;

const textareaField = (overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'bio-0',
    type: 'textarea',
    label: 'Bio',
    required: false,
    disabled: false,
    value: '',
    ...overrides,
  }) as FieldDto;

const checkboxField = (overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'agree-0',
    type: 'checkbox',
    label: 'Agree',
    required: false,
    disabled: false,
    value: false,
    ...overrides,
  }) as FieldDto;

const radioField = (options: string[] = ['a', 'b', 'c'], overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'choice-0',
    type: 'radio',
    label: 'Choice',
    required: false,
    disabled: false,
    options,
    value: null,
    ...overrides,
  }) as FieldDto;

const selectField = (options: string[] = ['a', 'b', 'c'], overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'select-0',
    type: 'select',
    label: 'Select',
    required: false,
    disabled: false,
    options,
    value: null,
    ...overrides,
  }) as FieldDto;

const multiSelectField = (options: string[] = ['x', 'y', 'z'], overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'tags-0',
    type: 'multi-select',
    label: 'Tags',
    required: false,
    disabled: false,
    options,
    value: [],
    ...overrides,
  }) as FieldDto;

const fileUploadField = (overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'doc-0',
    type: 'file-upload',
    label: 'Document',
    required: false,
    disabled: false,
    ...overrides,
  }) as FieldDto;

// ── text ─────────────────────────────────────────────────────────────────────

describe('hardValidate — text', () => {
  it('accepts a string of exactly 10,000 characters', () => {
    expect(() => hardValidate(textField(), 'a'.repeat(10_000))).not.toThrow();
  });

  it('rejects a string of 10,001 characters', () => {
    expect(() => hardValidate(textField(), 'a'.repeat(10_001))).toThrow(BadRequestException);
  });

  it('rejects a number (42)', () => {
    expect(() => hardValidate(textField(), 42)).toThrow(BadRequestException);
  });

  it('rejects null', () => {
    expect(() => hardValidate(textField(), null)).toThrow(BadRequestException);
  });
});

// ── textarea ──────────────────────────────────────────────────────────────────

describe('hardValidate — textarea', () => {
  it('accepts a string of exactly 100,000 characters', () => {
    expect(() => hardValidate(textareaField(), 'a'.repeat(100_000))).not.toThrow();
  });

  it('rejects a string of 100,001 characters', () => {
    expect(() => hardValidate(textareaField(), 'a'.repeat(100_001))).toThrow(BadRequestException);
  });

  it('rejects a number', () => {
    expect(() => hardValidate(textareaField(), 7)).toThrow(BadRequestException);
  });
});

// ── checkbox ──────────────────────────────────────────────────────────────────

describe('hardValidate — checkbox', () => {
  it('accepts boolean true', () => {
    expect(() => hardValidate(checkboxField(), true)).not.toThrow();
  });

  it('accepts boolean false', () => {
    expect(() => hardValidate(checkboxField(), false)).not.toThrow();
  });

  it('rejects string "true"', () => {
    expect(() => hardValidate(checkboxField(), 'true')).toThrow(BadRequestException);
  });

  it('rejects number 1', () => {
    expect(() => hardValidate(checkboxField(), 1)).toThrow(BadRequestException);
  });
});

// ── radio ─────────────────────────────────────────────────────────────────────

describe('hardValidate — radio', () => {
  it('accepts a valid option string', () => {
    expect(() => hardValidate(radioField(['yes', 'no']), 'yes')).not.toThrow();
  });

  it('accepts null', () => {
    expect(() => hardValidate(radioField(['yes', 'no']), null)).not.toThrow();
  });

  it('rejects a string not in options', () => {
    expect(() => hardValidate(radioField(['yes', 'no']), 'maybe')).toThrow(BadRequestException);
  });

  it('rejects when options.length > 500 regardless of value', () => {
    const hugeOptions = Array.from({ length: 501 }, (_, i) => `opt-${i}`);
    expect(() => hardValidate(radioField(hugeOptions), 'opt-0')).toThrow(BadRequestException);
  });

  it('rejects when options.length > 500 even when value is null', () => {
    const hugeOptions = Array.from({ length: 501 }, (_, i) => `opt-${i}`);
    expect(() => hardValidate(radioField(hugeOptions), null)).toThrow(BadRequestException);
  });

  it('rejects when an option definition exceeds 500 characters', () => {
    const longOption = 'a'.repeat(501);
    expect(() => hardValidate(radioField([longOption, 'b']), longOption)).toThrow(BadRequestException);
  });

  it('accepts when options.length is exactly 500', () => {
    const exactOptions = Array.from({ length: 500 }, (_, i) => `opt-${i}`);
    expect(() => hardValidate(radioField(exactOptions), 'opt-0')).not.toThrow();
  });
});

// ── select ─────────────────────────────────────────────────────────────────────

describe('hardValidate — select', () => {
  it('accepts a valid option string', () => {
    expect(() => hardValidate(selectField(['red', 'green', 'blue']), 'red')).not.toThrow();
  });

  it('accepts null', () => {
    expect(() => hardValidate(selectField(['red', 'green']), null)).not.toThrow();
  });

  it('rejects a string not in options', () => {
    expect(() => hardValidate(selectField(['red', 'green']), 'purple')).toThrow(BadRequestException);
  });

  it('rejects when options.length > 500', () => {
    const hugeOptions = Array.from({ length: 501 }, (_, i) => `opt-${i}`);
    expect(() => hardValidate(selectField(hugeOptions), 'opt-0')).toThrow(BadRequestException);
  });

  it('rejects when an option definition exceeds 500 characters', () => {
    const longOption = 'a'.repeat(501);
    expect(() => hardValidate(selectField([longOption, 'b']), longOption)).toThrow(BadRequestException);
  });

  it('accepts when options.length is exactly 500', () => {
    const exactOptions = Array.from({ length: 500 }, (_, i) => `opt-${i}`);
    expect(() => hardValidate(selectField(exactOptions), 'opt-0')).not.toThrow();
  });

  it('rejects when options.length > 500 even when value is null', () => {
    const hugeOptions = Array.from({ length: 501 }, (_, i) => `opt-${i}`);
    expect(() => hardValidate(selectField(hugeOptions), null)).toThrow(BadRequestException);
  });
});

// ── multi-select ──────────────────────────────────────────────────────────────

describe('hardValidate — multi-select', () => {
  it('accepts a valid array of options', () => {
    expect(() => hardValidate(multiSelectField(['x', 'y', 'z']), ['x', 'z'])).not.toThrow();
  });

  it('accepts an empty array', () => {
    expect(() => hardValidate(multiSelectField(['x', 'y']), [])).not.toThrow();
  });

  it('rejects an array containing an invalid element', () => {
    expect(() => hardValidate(multiSelectField(['x', 'y', 'z']), ['x', 'invalid'])).toThrow(BadRequestException);
  });

  it('rejects a non-array value', () => {
    expect(() => hardValidate(multiSelectField(['x', 'y']), 'x')).toThrow(BadRequestException);
  });

  it('rejects when an option definition exceeds 500 characters', () => {
    const longOption = 'a'.repeat(501);
    expect(() => hardValidate(multiSelectField([longOption, 'y']), [longOption])).toThrow(BadRequestException);
  });

  it('rejects when value.length > options.length', () => {
    expect(() => hardValidate(multiSelectField(['x', 'y']), ['x', 'x', 'x'])).toThrow(BadRequestException);
  });

  it('rejects when value array contains a non-string element', () => {
    expect(() => hardValidate(multiSelectField(['x', 'y']), [1, 'x'] as unknown[])).toThrow(BadRequestException);
  });

  it('rejects duplicate selections', () => {
    expect(() => hardValidate(multiSelectField(['a', 'b', 'c']), ['a', 'a'])).toThrow(BadRequestException);
  });

  it('rejects when options.length > 500', () => {
    const hugeOptions = Array.from({ length: 501 }, (_, i) => `opt-${i}`);
    expect(() => hardValidate(multiSelectField(hugeOptions), ['opt-0'])).toThrow(BadRequestException);
  });

  it('accepts when options.length is exactly 500', () => {
    const exactOptions = Array.from({ length: 500 }, (_, i) => `opt-${i}`);
    expect(() => hardValidate(multiSelectField(exactOptions), ['opt-0', 'opt-1'])).not.toThrow();
  });
});

// ── file-upload ───────────────────────────────────────────────────────────────

describe('hardValidate — file-upload', () => {
  it('throws BadRequestException for any value (must use upload endpoint)', () => {
    expect(() => hardValidate(fileUploadField(), 'some-file-id')).toThrow(BadRequestException);
  });

  it('throws BadRequestException for null', () => {
    expect(() => hardValidate(fileUploadField(), null)).toThrow(BadRequestException);
  });

  it('throws BadRequestException for undefined', () => {
    expect(() => hardValidate(fileUploadField(), undefined)).toThrow(BadRequestException);
  });

  it('throws BadRequestException for a numeric value', () => {
    expect(() => hardValidate(fileUploadField(), 42)).toThrow(BadRequestException);
  });
});

// ── unknown type ──────────────────────────────────────────────────────────────

describe('hardValidate — unknown type', () => {
  it('throws BadRequestException for an unknown field type', () => {
    const unknownField = { id: 'x-0', type: 'date', label: 'Date', required: false, disabled: false } as unknown as FieldDto;
    expect(() => hardValidate(unknownField, '2024-01-01')).toThrow(BadRequestException);
  });
});

// ── STRUCTURAL_FIELDS ─────────────────────────────────────────────────────────

describe('STRUCTURAL_FIELDS — proto-pollution guard', () => {
  it('blocks __proto__', () => {
    expect(STRUCTURAL_FIELDS.has('__proto__')).toBe(true);
  });

  it('blocks constructor', () => {
    expect(STRUCTURAL_FIELDS.has('constructor')).toBe(true);
  });

  it('blocks prototype', () => {
    expect(STRUCTURAL_FIELDS.has('prototype')).toBe(true);
  });
});

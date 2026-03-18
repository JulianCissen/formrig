import { FieldDto } from '@formrig/shared';
import { buildExtractionSchema } from '../utils/rule-to-json-schema.util';

function makeField(overrides: Partial<FieldDto> & { type: FieldDto['type'] }): FieldDto {
  return {
    id: 'test-field-0',
    label: 'Test Field',
    required: false,
    disabled: false,
    ...overrides,
  } as FieldDto;
}

function valueSchema(result: Record<string, unknown> | null): Record<string, unknown> {
  return (result!.properties as Record<string, unknown>).value as Record<string, unknown>;
}

describe('buildExtractionSchema()', () => {
  describe('file-upload → null', () => {
    it('returns null for file-upload fields', () => {
      const field = makeField({ type: 'file-upload' });
      expect(buildExtractionSchema(field, {})).toBeNull();
    });
  });

  describe('base type mappings', () => {
    it('text → type string', () => {
      const result = buildExtractionSchema(makeField({ type: 'text' }), {});
      expect(valueSchema(result).type).toBe('string');
    });

    it('textarea → type string', () => {
      const result = buildExtractionSchema(makeField({ type: 'textarea' }), {});
      expect(valueSchema(result).type).toBe('string');
    });

    it('checkbox → type boolean', () => {
      const result = buildExtractionSchema(makeField({ type: 'checkbox' }), {});
      expect(valueSchema(result).type).toBe('boolean');
    });

    it('radio with options → enum matches options', () => {
      const result = buildExtractionSchema(
        makeField({ type: 'radio', options: ['A', 'B'] }),
        {},
      );
      expect(valueSchema(result).enum).toEqual(['A', 'B']);
    });

    it('select required → enum does NOT contain null', () => {
      const result = buildExtractionSchema(
        makeField({ type: 'select', options: ['X', 'Y'], required: true }),
        {},
      );
      expect(valueSchema(result).enum as unknown[]).not.toContain(null);
    });

    it('select not-required → enum contains null', () => {
      const result = buildExtractionSchema(
        makeField({ type: 'select', options: ['X', 'Y'], required: false }),
        {},
      );
      expect(valueSchema(result).enum as unknown[]).toContain(null);
    });

    it('multi-select → type array with items enum', () => {
      const result = buildExtractionSchema(
        makeField({ type: 'multi-select', options: ['A', 'B'] }),
        {},
      );
      const v = valueSchema(result);
      expect(v.type).toBe('array');
      expect((v.items as Record<string, unknown>).enum as unknown[]).toContain('A');
    });

    it('date-picker → type string with pattern and description', () => {
      const result = buildExtractionSchema(makeField({ type: 'date-picker' }), {});
      const v = valueSchema(result);
      expect(v.type).toBe('string');
      expect(v.pattern).toBeDefined();
      expect(v.description).toBeDefined();
    });

    it('number → type integer', () => {
      const result = buildExtractionSchema(makeField({ type: 'number' }), {});
      expect(valueSchema(result).type).toBe('integer');
    });
  });

  describe('required wrapper logic', () => {
    it('required text → wrapper has required: [value]', () => {
      const result = buildExtractionSchema(makeField({ type: 'text', required: true }), {});
      expect(result!.required).toEqual(['value']);
    });

    it('not-required text → wrapper has no required property', () => {
      const result = buildExtractionSchema(makeField({ type: 'text', required: false }), {});
      expect(result!.required).toBeUndefined();
    });

    it('required checkbox → wrapper has no required property', () => {
      const result = buildExtractionSchema(
        makeField({ type: 'checkbox', required: true }),
        {},
      );
      expect(result!.required).toBeUndefined();
    });
  });

  describe('rule: min-length', () => {
    it('sets minLength on schema', () => {
      const field = makeField({ type: 'text', rules: [{ type: 'min-length', min: 3 }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).minLength).toBe(3);
    });
  });

  describe('rule: max-length', () => {
    it('sets maxLength on schema', () => {
      const field = makeField({ type: 'text', rules: [{ type: 'max-length', max: 100 }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).maxLength).toBe(100);
    });
  });

  describe('rule: matches-pattern', () => {
    it('sets pattern on schema', () => {
      const field = makeField({
        type: 'text',
        rules: [{ type: 'matches-pattern', pattern: '^[a-z]+$' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).pattern).toBe('^[a-z]+$');
    });
  });

  describe('rule: min-value', () => {
    it('sets minimum on schema', () => {
      const field = makeField({ type: 'number', rules: [{ type: 'min-value', min: 5 }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).minimum).toBe(5);
    });
  });

  describe('rule: max-value', () => {
    it('sets maximum on schema', () => {
      const field = makeField({ type: 'number', rules: [{ type: 'max-value', max: 10 }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).maximum).toBe(10);
    });
  });

  describe('rule: min-count', () => {
    it('sets minItems on schema', () => {
      const field = makeField({
        type: 'multi-select',
        options: ['A'],
        rules: [{ type: 'min-count', min: 2 }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).minItems).toBe(2);
    });
  });

  describe('rule: max-count', () => {
    it('sets maxItems on schema', () => {
      const field = makeField({
        type: 'multi-select',
        options: ['A'],
        rules: [{ type: 'max-count', max: 5 }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).maxItems).toBe(5);
    });
  });

  describe('rule: is-true', () => {
    it('sets const to true', () => {
      const field = makeField({ type: 'checkbox', rules: [{ type: 'is-true' }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).const).toBe(true);
    });
  });

  describe('rule: is-false', () => {
    it('sets const to false', () => {
      const field = makeField({ type: 'checkbox', rules: [{ type: 'is-false' }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).const).toBe(false);
    });
  });

  describe('rule: equals', () => {
    it('sets const to the expected value', () => {
      const field = makeField({ type: 'text', rules: [{ type: 'equals', expected: 'foo' }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).const).toBe('foo');
    });
  });

  describe('rule: not-equals', () => {
    it('adds hint containing "Must not equal" to description', () => {
      const field = makeField({
        type: 'text',
        rules: [{ type: 'not-equals', expected: 'bar' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain('Must not equal');
    });
  });

  describe('rule: is-empty', () => {
    it('adds hint "Must be empty" to description', () => {
      const field = makeField({ type: 'text', rules: [{ type: 'is-empty' }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain('Must be empty');
    });
  });

  describe('rule: is-not-empty (text)', () => {
    it('sets minLength to 1 for text field', () => {
      const field = makeField({ type: 'text', rules: [{ type: 'is-not-empty' }] });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).minLength).toBe(1);
    });
  });

  describe('rule: is-not-empty (multi-select)', () => {
    it('sets minItems to 1 for multi-select field', () => {
      const field = makeField({
        type: 'multi-select',
        options: ['A'],
        rules: [{ type: 'is-not-empty' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).minItems).toBe(1);
    });
  });

  describe('rule: contains', () => {
    it('adds hint containing "Must contain the text:" to description', () => {
      const field = makeField({
        type: 'text',
        rules: [{ type: 'contains', substring: 'hello' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain("Must contain the text: 'hello'");
    });
  });

  describe('rule: equals-field', () => {
    it('includes fieldId in hint and falls back to "not yet collected" when field absent', () => {
      const field = makeField({
        type: 'text',
        rules: [{ type: 'equals-field', fieldId: 'other-field' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain("Must equal the value for 'other-field'");
      expect(valueSchema(result).description as string).toContain('not yet collected');
    });

    it('includes the resolved value from collectedValues in the hint', () => {
      const field = makeField({
        type: 'text',
        rules: [{ type: 'equals-field', fieldId: 'other-field' }],
      });
      const result = buildExtractionSchema(field, { 'other-field': 'john' });
      expect(valueSchema(result).description as string).toContain('john');
    });
  });

  describe('rule: comes-after-field', () => {
    it('falls back to "the value of <fieldId>" when collectedValues does not contain the field', () => {
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'comes-after-field', fieldId: 'start-date' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain('Must be a date after the value of start-date');
    });

    it('includes the resolved value from collectedValues in the hint', () => {
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'comes-after-field', fieldId: 'start-date' }],
      });
      const result = buildExtractionSchema(field, { 'start-date': '2024-01-01' });
      expect(valueSchema(result).description as string).toContain('Must be a date after 2024-01-01');
    });
  });

  describe('rule: comes-before-field', () => {
    it('falls back to "the value of <fieldId>" when collectedValues does not contain the field', () => {
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'comes-before-field', fieldId: 'end-date' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain('Must be a date before the value of end-date');
    });

    it('includes the resolved value from collectedValues in the hint', () => {
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'comes-before-field', fieldId: 'end-date' }],
      });
      const result = buildExtractionSchema(field, { 'end-date': '2024-12-31' });
      expect(valueSchema(result).description as string).toContain('Must be a date before 2024-12-31');
    });
  });

  describe('rule: older-than', () => {
    it('adds hint with years and cutoff date', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-12'));
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'older-than', years: 18 }],
      });
      const result = buildExtractionSchema(field, {});
      jest.useRealTimers();
      const description = valueSchema(result).description as string;
      expect(description).toContain('The person must be at least 18 years old');
      expect(description).toContain('2008-03-12');
    });
  });

  describe('rule: younger-than', () => {
    it('adds hint containing "younger than" to description', () => {
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'younger-than', years: 65 }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain('younger than');
    });
  });

  describe('rule: before-static-date', () => {
    it('adds "Must be a date before 2025-01-01" hint to description', () => {
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'before-static-date', date: '2025-01-01' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain('Must be a date before 2025-01-01');
    });
  });

  describe('rule: after-static-date', () => {
    it('adds "Must be a date after 2024-01-01" hint to description', () => {
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'after-static-date', date: '2024-01-01' }],
      });
      const result = buildExtractionSchema(field, {});
      expect(valueSchema(result).description as string).toContain('Must be a date after 2024-01-01');
    });
  });

  describe('description hint accumulation', () => {
    it('joins multiple hints with "; "', () => {
      const field = makeField({
        type: 'text',
        rules: [
          { type: 'not-equals', expected: 'foo' },
          { type: 'is-empty' },
        ],
      });
      const result = buildExtractionSchema(field, {});
      const description = valueSchema(result).description as string;
      expect(description).toContain('Must not equal');
      expect(description).toContain('Must be empty');
      expect(description).toContain('; ');
    });
  });

  describe('date-picker: description includes ISO hint and accumulated hints', () => {
    it('contains ISO 8601 hint and rule hint', () => {
      const field = makeField({
        type: 'date-picker',
        rules: [{ type: 'after-static-date', date: '2024-01-01' }],
      });
      const result = buildExtractionSchema(field, {});
      const description = valueSchema(result).description as string;
      expect(description).toContain('ISO 8601 date');
      expect(description).toContain('Must be a date after');
    });
  });
});

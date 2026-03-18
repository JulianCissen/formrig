import { FieldDto, IsTrueRule } from '@formrig/shared';
import { FormChatStateMachine } from '../form-chat-state-machine';

// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeField(
  overrides: Partial<FieldDto> & { id: string; type?: FieldDto['type'] },
): FieldDto {
  return {
    type: 'text',
    label: overrides.id,
    required: false,
    disabled: false,
    ...overrides,
  } as unknown as FieldDto;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FormChatStateMachine', () => {
  let sm: FormChatStateMachine;

  beforeEach(() => {
    sm = new FormChatStateMachine();
  });

  // ── PASS 1 scenarios ───────────────────────────────────────────────────────

  describe('PASS 1 — linear traversal', () => {
    it('returns the first field when all fields are unanswered', () => {
      const fields = [
        makeField({ id: 'f0' }),
        makeField({ id: 'f1' }),
        makeField({ id: 'f2' }),
      ];
      const result = sm.getNextSlot(fields, {}, { skippedFieldIds: [], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'field', field: fields[0] });
    });

    it('skips an already-answered field and returns the next one', () => {
      const fields = [
        makeField({ id: 'f0' }),
        makeField({ id: 'f1' }),
        makeField({ id: 'f2' }),
      ];
      const result = sm.getNextSlot(fields, { 'f0': 'answered' }, { skippedFieldIds: [], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'field', field: fields[1] });
    });

    it('skips a field whose visibleWhen evaluates to false', () => {
      const hiddenField = makeField({
        id: 'f0',
        // Runtime ConditionTree: evaluates to false when 'show-me' is not true
        visibleWhen: { fieldId: 'show-me', rule: new IsTrueRule() },
      } as unknown as Partial<FieldDto> & { id: string });
      const visibleField = makeField({ id: 'f1' });
      const fields = [hiddenField, visibleField];

      // 'show-me' is false → f0 hidden → PASS 1 returns f1
      const result = sm.getNextSlot(fields, { 'show-me': false }, { skippedFieldIds: [], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'field', field: visibleField });
    });

    it('skips a field whose id is in skippedFieldIds', () => {
      const fields = [
        makeField({ id: 'f0' }),
        makeField({ id: 'f1' }),
      ];
      const result = sm.getNextSlot(fields, {}, { skippedFieldIds: ['f0'], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'field', field: fields[1] });
    });
  });

  // ── PASS 2 scenarios ───────────────────────────────────────────────────────

  describe('PASS 2 — cycling traverse for required fields', () => {
    it('returns a skipped required field in PASS 2 when PASS 1 exhausts', () => {
      const fields = [
        makeField({ id: 'f0', required: true }),
        makeField({ id: 'f1', required: false }),
        makeField({ id: 'f2', required: false }),
      ];
      // f0 required but skipped; f1 optional skipped; f2 answered
      const result = sm.getNextSlot(fields, { 'f2': 'answered' }, { skippedFieldIds: ['f0', 'f1'], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'field', field: fields[0] });
    });

    it('does NOT return a skipped optional field in PASS 2', () => {
      const fields = [
        makeField({ id: 'f0', required: false }),
      ];
      // f0 is optional and skipped — PASS 1 skips it, PASS 2 ignores (not required)
      const result = sm.getNextSlot(fields, {}, { skippedFieldIds: ['f0'], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'completed' });
    });

    it('returns required fields in declaration order in PASS 2', () => {
      const fields = [
        makeField({ id: 'f0', required: true }),
        makeField({ id: 'f1', required: true }),
      ];
      // Both required, both skipped — PASS 1 exhausts, PASS 2 returns f0 first
      const firstCall = sm.getNextSlot(fields, {}, { skippedFieldIds: ['f0', 'f1'], unconfirmedFieldIds: [] });
      expect(firstCall).toEqual({ kind: 'field', field: fields[0] });

      // Simulate marking f0 as answered, then PASS 2 returns f1
      const secondCall = sm.getNextSlot(fields, { 'f0': 'done' }, { skippedFieldIds: ['f1'], unconfirmedFieldIds: [] });
      expect(secondCall).toEqual({ kind: 'field', field: fields[1] });
    });

    it('hidden required field is never returned in PASS 2', () => {
      const hiddenRequired = makeField({
        id: 'f0',
        required: true,
        visibleWhen: { fieldId: 'show-me', rule: new IsTrueRule() },
      } as unknown as Partial<FieldDto> & { id: string });
      const fields = [hiddenRequired];

      // f0 hidden → PASS 2 also skips it → completed
      const result = sm.getNextSlot(fields, { 'show-me': false }, { skippedFieldIds: ['f0'], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'completed' });
    });
  });

  // ── COMPLETED scenarios ────────────────────────────────────────────────────

  describe('COMPLETED', () => {
    it('returns completed when all required fields are answered', () => {
      const fields = [
        makeField({ id: 'f0', required: true }),
        makeField({ id: 'f1', required: false }),
      ];
      // f0 answered; f1 optional also answered
      const result = sm.getNextSlot(fields, { 'f0': 'value', 'f1': 'value' }, { skippedFieldIds: [], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'completed' });
    });

    it('returns completed when all required answered and optional skipped', () => {
      const fields = [
        makeField({ id: 'f0', required: true }),
        makeField({ id: 'f1', required: false }),
      ];
      const result = sm.getNextSlot(fields, { 'f0': 'value' }, { skippedFieldIds: ['f1'], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'completed' });
    });

    it('returns completed immediately for an empty field list', () => {
      const result = sm.getNextSlot([], {}, { skippedFieldIds: [], unconfirmedFieldIds: [] });
      expect(result).toEqual({ kind: 'completed' });
    });
  });

  // ── isAnswered per type ────────────────────────────────────────────────────

  describe('isAnswered()', () => {
    it('returns true for a text field with a non-empty string', () => {
      const field = makeField({ id: 'f', type: 'text' });
      expect(sm.isAnswered(field, { f: 'hello' }, [])).toBe(true);
    });

    it('returns false for a text field with an empty string', () => {
      const field = makeField({ id: 'f', type: 'text' });
      expect(sm.isAnswered(field, { f: '' }, [])).toBe(false);
    });

    it('returns false for a text field with null', () => {
      const field = makeField({ id: 'f', type: 'text' });
      expect(sm.isAnswered(field, { f: null }, [])).toBe(false);
    });

    it('returns false for a text field absent from formValues (undefined)', () => {
      const field = makeField({ id: 'f', type: 'text' });
      expect(sm.isAnswered(field, {}, [])).toBe(false);
    });

    it('returns true for a checkbox field with false value (checkboxes cannot be required)', () => {
      const field = makeField({ id: 'f', type: 'checkbox' });
      expect(sm.isAnswered(field, { f: false }, [])).toBe(true);
    });

    it('returns false for a checkbox field absent from formValues', () => {
      const field = makeField({ id: 'f', type: 'checkbox' });
      expect(sm.isAnswered(field, {}, [])).toBe(false);
    });

    it('returns true for a multi-select field with a non-empty array', () => {
      const field = makeField({ id: 'f', type: 'multi-select', options: ['a', 'b'] });
      expect(sm.isAnswered(field, { f: ['a'] }, [])).toBe(true);
    });

    it('returns false for a multi-select field with an empty array', () => {
      const field = makeField({ id: 'f', type: 'multi-select', options: ['a', 'b'] });
      expect(sm.isAnswered(field, { f: [] }, [])).toBe(false);
    });

    it('returns true for a number field with 0', () => {
      const field = makeField({ id: 'f', type: 'number' });
      expect(sm.isAnswered(field, { f: 0 }, [])).toBe(true);
    });

    // AC-3: checkbox value === false → answered
    it('returns true for a checkbox field with value false', () => {
      const field = { id: 'c1', type: 'checkbox', label: 'Agree' } as FieldDto;
      expect(sm.isAnswered(field, { c1: false }, [])).toBe(true);
    });

    // AC-5: field.id in unconfirmedFieldIds → not answered regardless of value
    it('returns false when field.id is in unconfirmedFieldIds, regardless of value', () => {
      const field = { id: 'f1', type: 'text', label: 'Name' } as FieldDto;
      expect(sm.isAnswered(field, { f1: 'Alice' }, ['f1'])).toBe(false);
    });

    it('returns false when checkbox field.id is in unconfirmedFieldIds even if value is true', () => {
      const field = { id: 'c1', type: 'checkbox', label: 'Agree' } as FieldDto;
      expect(sm.isAnswered(field, { c1: true }, ['c1'])).toBe(false);
    });

    // AC-6: non-checkbox non-empty value not in unconfirmedFieldIds → answered
    it('returns true for a non-checkbox field with a non-empty value not in unconfirmedFieldIds', () => {
      const field = { id: 'f1', type: 'text', label: 'Name' } as FieldDto;
      expect(sm.isAnswered(field, { f1: 'Alice' }, [])).toBe(true);
    });
  });

  // AC-7: getNextSlot context object — unconfirmed integration
  describe('getNextSlot() with unconfirmedFieldIds', () => {
    it('getNextSlot skips an unconfirmed field even if its value is set', () => {
      const field = { id: 'f1', type: 'text', label: 'Name', required: true } as FieldDto;
      const result = sm.getNextSlot([field], { f1: 'Alice' }, { skippedFieldIds: [], unconfirmedFieldIds: ['f1'] });
      expect(result).toEqual({ kind: 'field', field });
    });
  });
});

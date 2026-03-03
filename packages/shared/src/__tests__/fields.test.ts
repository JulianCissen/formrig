import { MultiSelectField, SelectField } from '../fields';
import { FieldDtoSchema } from '../form-definition-dto';

// ── MultiSelectField constructor ─────────────────────────────────────────────

describe('MultiSelectField — autocomplete default', () => {
  const field = new MultiSelectField('Skills', ['a', 'b', 'c']);

  it('type discriminator is "multi-select"', () => expect(field.type).toBe('multi-select'));
  it('autocomplete defaults to false', () => expect(field.autocomplete).toBe(false));
  it('value defaults to empty array', () => expect(field.value).toEqual([]));
  it('required defaults to false', () => expect(field.required).toBe(false));
  it('disabled defaults to false', () => expect(field.disabled).toBe(false));
});

describe('MultiSelectField — autocomplete: true', () => {
  // positional: label, options, value, autocomplete, required, disabled
  const field = new MultiSelectField('Country', ['AU', 'NZ'], [], true, true);

  it('autocomplete is true when passed as 4th positional arg', () => expect(field.autocomplete).toBe(true));
  it('required is true when passed as 5th positional arg', () => expect(field.required).toBe(true));
  it('value is the provided empty array', () => expect(field.value).toEqual([]));
});

describe('MultiSelectField — autocomplete parameter position matches SelectField', () => {
  // SelectField: (label, options, value, autocomplete, required, disabled)
  const select = new SelectField('Pick one', ['x'], null, true, false);
  const multi  = new MultiSelectField('Pick many', ['x'], [], true, false);

  it('SelectField autocomplete position results in true', () => expect(select.autocomplete).toBe(true));
  it('MultiSelectField autocomplete position results in true', () => expect(multi.autocomplete).toBe(true));
  it('both classes have the same parameter order for autocomplete (4th)', () => {
    // Both should have autocomplete=true and required=false when called with same positional intent
    expect(select.autocomplete).toBe(multi.autocomplete);
    expect(select.required).toBe(multi.required);
  });
});

// ── MultiSelectFieldDtoSchema (via FieldDtoSchema discriminated union) ───────

describe('MultiSelectFieldDtoSchema — autocomplete field', () => {
  const base = {
    id: 'f1',
    type: 'multi-select' as const,
    label: 'Skills',
    required: false,
    disabled: false,
    options: ['a', 'b'],
  };

  it('parses successfully without autocomplete (field is optional)', () => {
    const result = FieldDtoSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('parses successfully with autocomplete: false', () => {
    const result = FieldDtoSchema.safeParse({ ...base, autocomplete: false });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'multi-select') {
      expect(result.data.autocomplete).toBe(false);
    }
  });

  it('parses successfully with autocomplete: true', () => {
    const result = FieldDtoSchema.safeParse({ ...base, autocomplete: true });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'multi-select') {
      expect(result.data.autocomplete).toBe(true);
    }
  });

  it('rejects autocomplete as a non-boolean string', () => {
    const result = FieldDtoSchema.safeParse({ ...base, autocomplete: 'yes' });
    expect(result.success).toBe(false);
  });

  it('parsed data includes value as an array when provided', () => {
    const result = FieldDtoSchema.safeParse({ ...base, autocomplete: true, value: ['a'] });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'multi-select') {
      expect(result.data.value).toEqual(['a']);
    }
  });
});

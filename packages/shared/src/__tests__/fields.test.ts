import { MultiSelectField, SelectField, DatePickerField } from '../fields';
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

// ── DatePickerField constructor ──────────────────────────────────────────────────────

describe('DatePickerField', () => {
  it('has type "date-picker"', () => expect(new DatePickerField('DOB').type).toBe('date-picker'));
  it('defaults value to null', () => expect(new DatePickerField('DOB').value).toBeNull());
  it('accepts initial value', () => expect(new DatePickerField('DOB', '2000-01-31').value).toBe('2000-01-31'));
  it('defaults required to false', () => expect(new DatePickerField('DOB').required).toBe(false));
  it('defaults disabled to false', () => expect(new DatePickerField('DOB').disabled).toBe(false));

  it('minDate is undefined by default', () => expect(new DatePickerField('DOB').minDate).toBeUndefined());
  it('maxDate is undefined by default', () => expect(new DatePickerField('DOB').maxDate).toBeUndefined());
  it('minAge is undefined by default', () => expect(new DatePickerField('DOB').minAge).toBeUndefined());
  it('maxAge is undefined by default', () => expect(new DatePickerField('DOB').maxAge).toBeUndefined());

  it('minDate can be assigned after construction', () => {
    const f = new DatePickerField('DOB');
    f.minDate = '2000-01-01';
    expect(f.minDate).toBe('2000-01-01');
  });

  it('maxDate can be assigned after construction', () => {
    const f = new DatePickerField('DOB');
    f.maxDate = '2025-12-31';
    expect(f.maxDate).toBe('2025-12-31');
  });

  it('minAge can be assigned after construction', () => {
    const f = new DatePickerField('DOB');
    f.minAge = 18;
    expect(f.minAge).toBe(18);
  });

  it('maxAge can be assigned after construction', () => {
    const f = new DatePickerField('DOB');
    f.maxAge = 100;
    expect(f.maxAge).toBe(100);
  });

  it('all four shorthand props can be set simultaneously via Object.assign', () => {
    const f = Object.assign(new DatePickerField('DOB'), { minDate: '1900-01-01', maxDate: '2006-01-01', minAge: 18, maxAge: 120 });
    expect(f.minDate).toBe('1900-01-01');
    expect(f.maxDate).toBe('2006-01-01');
    expect(f.minAge).toBe(18);
    expect(f.maxAge).toBe(120);
  });
});

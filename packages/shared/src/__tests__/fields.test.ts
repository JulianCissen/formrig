import { MultiSelectField, SelectField, DatePickerField, TextField, TextareaField, FileUploadField } from '../fields';
import { FieldDtoSchema } from '../form-definition-dto';

// ── MultiSelectField constructor ─────────────────────────────────────────────

describe('MultiSelectField — autocomplete default', () => {
  const field = new MultiSelectField({ label: 'Skills', options: ['a', 'b', 'c'] });

  it('type discriminator is "multi-select"', () => expect(field.type).toBe('multi-select'));
  it('autocomplete defaults to false', () => expect(field.autocomplete).toBe(false));
  it('value defaults to empty array', () => expect(field.value).toEqual([]));
  it('required defaults to false', () => expect(field.required).toBe(false));
  it('disabled defaults to false', () => expect(field.disabled).toBe(false));
});

describe('MultiSelectField — autocomplete: true', () => {
  const field = new MultiSelectField({ label: 'Country', options: ['AU', 'NZ'], value: [], autocomplete: true, required: true });

  it('autocomplete is true when passed as named key', () => expect(field.autocomplete).toBe(true));
  it('required is true when passed as named key', () => expect(field.required).toBe(true));
  it('value is the provided empty array', () => expect(field.value).toEqual([]));
});

describe('MultiSelectField — autocomplete named key aligns with SelectField', () => {
  const select = new SelectField({ label: 'Pick one', options: ['x'], value: null, autocomplete: true, required: false });
  const multi  = new MultiSelectField({ label: 'Pick many', options: ['x'], value: [], autocomplete: true, required: false });

  it('SelectField autocomplete named key is true', () => expect(select.autocomplete).toBe(true));
  it('MultiSelectField autocomplete named key is true', () => expect(multi.autocomplete).toBe(true));
  it('both classes have the same named key for autocomplete', () => {
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
  it('has type "date-picker"', () => expect(new DatePickerField({ label: 'DOB' }).type).toBe('date-picker'));
  it('defaults value to null', () => expect(new DatePickerField({ label: 'DOB' }).value).toBeNull());
  it('accepts initial value', () => expect(new DatePickerField({ label: 'DOB', value: '2000-01-31' }).value).toBe('2000-01-31'));
  it('defaults required to false', () => expect(new DatePickerField({ label: 'DOB' }).required).toBe(false));
  it('defaults disabled to false', () => expect(new DatePickerField({ label: 'DOB' }).disabled).toBe(false));

  it('minDate is undefined by default', () => expect(new DatePickerField({ label: 'DOB' }).minDate).toBeUndefined());
  it('maxDate is undefined by default', () => expect(new DatePickerField({ label: 'DOB' }).maxDate).toBeUndefined());
  it('minAge is undefined by default', () => expect(new DatePickerField({ label: 'DOB' }).minAge).toBeUndefined());
  it('maxAge is undefined by default', () => expect(new DatePickerField({ label: 'DOB' }).maxAge).toBeUndefined());

  it('minDate can be assigned after construction', () => {
    const f = new DatePickerField({ label: 'DOB' });
    f.minDate = '2000-01-01';
    expect(f.minDate).toBe('2000-01-01');
  });

  it('maxDate can be assigned after construction', () => {
    const f = new DatePickerField({ label: 'DOB' });
    f.maxDate = '2025-12-31';
    expect(f.maxDate).toBe('2025-12-31');
  });

  it('minAge can be assigned after construction', () => {
    const f = new DatePickerField({ label: 'DOB' });
    f.minAge = 18;
    expect(f.minAge).toBe(18);
  });

  it('maxAge can be assigned after construction', () => {
    const f = new DatePickerField({ label: 'DOB' });
    f.maxAge = 100;
    expect(f.maxAge).toBe(100);
  });

  it('all four shorthand props can be set simultaneously via constructor', () => {
    const f = new DatePickerField({ label: 'DOB', minDate: '1900-01-01', maxDate: '2006-01-01', minAge: 18, maxAge: 120 });
    expect(f.minDate).toBe('1900-01-01');
    expect(f.maxDate).toBe('2006-01-01');
    expect(f.minAge).toBe(18);
    expect(f.maxAge).toBe(120);
  });
});

// ── TextField constructor-option shorthand props ──────────────────────────────

describe('TextField', () => {
  it('minCharacters is undefined by default', () => expect(new TextField({ label: 'Name' }).minCharacters).toBeUndefined());
  it('maxCharacters is undefined by default', () => expect(new TextField({ label: 'Name' }).maxCharacters).toBeUndefined());
  it('pattern is undefined by default', () => expect(new TextField({ label: 'Name' }).pattern).toBeUndefined());

  it('minCharacters is assigned via constructor', () => expect(new TextField({ label: 'Name', minCharacters: 2 }).minCharacters).toBe(2));
  it('maxCharacters is assigned via constructor', () => expect(new TextField({ label: 'Name', maxCharacters: 100 }).maxCharacters).toBe(100));
  it('pattern is assigned via constructor', () => expect(new TextField({ label: 'Name', pattern: '^[A-Z]+$' }).pattern).toBe('^[A-Z]+$'));

  it('all three shorthand props can be set simultaneously via constructor', () => {
    const f = new TextField({ label: 'Name', minCharacters: 3, maxCharacters: 50, pattern: '^\\w+$' });
    expect(f.minCharacters).toBe(3);
    expect(f.maxCharacters).toBe(50);
    expect(f.pattern).toBe('^\\w+$');
  });
});

// ── TextareaField constructor-option shorthand props ─────────────────────────

describe('TextareaField', () => {
  it('minCharacters is undefined by default', () => expect(new TextareaField({ label: 'Bio' }).minCharacters).toBeUndefined());
  it('maxCharacters is undefined by default', () => expect(new TextareaField({ label: 'Bio' }).maxCharacters).toBeUndefined());

  it('minCharacters is assigned via constructor', () => expect(new TextareaField({ label: 'Bio', minCharacters: 10 }).minCharacters).toBe(10));
  it('maxCharacters is assigned via constructor', () => expect(new TextareaField({ label: 'Bio', maxCharacters: 500 }).maxCharacters).toBe(500));

  it('both shorthand props can be set simultaneously via constructor', () => {
    const f = new TextareaField({ label: 'Bio', minCharacters: 10, maxCharacters: 500 });
    expect(f.minCharacters).toBe(10);
    expect(f.maxCharacters).toBe(500);
  });
});

// ── FileUploadField constructor-option shorthand props ───────────────────────

describe('FileUploadField', () => {
  it('maxFiles is undefined by default', () => expect(new FileUploadField({ label: 'Resume' }).maxFiles).toBeUndefined());
  it('maxSizeBytes is undefined by default', () => expect(new FileUploadField({ label: 'Resume' }).maxSizeBytes).toBeUndefined());
  it('rename is undefined by default', () => expect(new FileUploadField({ label: 'Resume' }).rename).toBeUndefined());

  it('maxFiles is assigned via constructor', () => expect(new FileUploadField({ label: 'Resume', maxFiles: 3 }).maxFiles).toBe(3));
  it('maxSizeBytes is assigned via constructor', () => expect(new FileUploadField({ label: 'Resume', maxSizeBytes: 5_000_000 }).maxSizeBytes).toBe(5_000_000));
  it('rename is assigned via constructor', () => expect(new FileUploadField({ label: 'Resume', rename: 'cv' }).rename).toBe('cv'));

  it('all three shorthand props can be set simultaneously via constructor', () => {
    const f = new FileUploadField({ label: 'Resume', maxFiles: 2, maxSizeBytes: 1_048_576, rename: 'attachment' });
    expect(f.maxFiles).toBe(2);
    expect(f.maxSizeBytes).toBe(1_048_576);
    expect(f.rename).toBe('attachment');
  });
});

// ── MultiSelectField constructor-option shorthand props ──────────────────────

describe('MultiSelectField — minSelected / maxSelected', () => {
  it('minSelected is undefined by default', () => expect(new MultiSelectField({ label: 'Skills', options: ['a'] }).minSelected).toBeUndefined());
  it('maxSelected is undefined by default', () => expect(new MultiSelectField({ label: 'Skills', options: ['a'] }).maxSelected).toBeUndefined());

  it('minSelected is assigned via constructor', () => expect(new MultiSelectField({ label: 'Skills', options: ['a', 'b'], minSelected: 1 }).minSelected).toBe(1));
  it('maxSelected is assigned via constructor', () => expect(new MultiSelectField({ label: 'Skills', options: ['a', 'b'], maxSelected: 5 }).maxSelected).toBe(5));

  it('both shorthand props can be set simultaneously via constructor', () => {
    const f = new MultiSelectField({ label: 'Skills', options: ['a', 'b', 'c'], minSelected: 1, maxSelected: 3 });
    expect(f.minSelected).toBe(1);
    expect(f.maxSelected).toBe(3);
  });
});

import { FieldDtoSchema } from '../form-definition-dto';

// ── DatePickerFieldDtoSchema (via FieldDtoSchema discriminated union) ─────────

describe('DatePickerFieldDtoSchema (via FieldDtoSchema)', () => {
  const base = { id: 'dob-0', type: 'date-picker' as const, label: 'DOB', required: false, disabled: false };

  it('parses valid yyyy-mm-dd value', () => {
    expect(FieldDtoSchema.parse({ ...base, value: '2000-01-31' }).type).toBe('date-picker');
  });
  it('parses null value', () => {
    expect(FieldDtoSchema.parse({ ...base, value: null }).type).toBe('date-picker');
  });
  it('omits value (optional)', () => {
    expect(FieldDtoSchema.parse({ ...base }).type).toBe('date-picker');
  });
  it('rejects non-string value', () => {
    expect(() => FieldDtoSchema.parse({ ...base, value: 123 })).toThrow();
  });

  // minDate / maxDate
  it('accepts valid minDate in yyyy-mm-dd format', () => {
    const result = FieldDtoSchema.safeParse({ ...base, minDate: '2000-01-01' });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.minDate).toBe('2000-01-01');
  });

  it('accepts valid maxDate in yyyy-mm-dd format', () => {
    const result = FieldDtoSchema.safeParse({ ...base, maxDate: '2025-12-31' });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.maxDate).toBe('2025-12-31');
  });

  it('rejects minDate with wrong format', () => {
    expect(FieldDtoSchema.safeParse({ ...base, minDate: '01/01/2000' }).success).toBe(false);
  });

  it('rejects maxDate with wrong format', () => {
    expect(FieldDtoSchema.safeParse({ ...base, maxDate: '2025-1-1' }).success).toBe(false);
  });

  it('omits minDate (optional)', () => {
    const result = FieldDtoSchema.safeParse({ ...base });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.minDate).toBeUndefined();
  });

  // minAge / maxAge
  it('accepts valid positive integer minAge', () => {
    const result = FieldDtoSchema.safeParse({ ...base, minAge: 18 });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.minAge).toBe(18);
  });

  it('accepts valid positive integer maxAge', () => {
    const result = FieldDtoSchema.safeParse({ ...base, maxAge: 120 });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.maxAge).toBe(120);
  });

  it('rejects minAge of zero', () => {
    expect(FieldDtoSchema.safeParse({ ...base, minAge: 0 }).success).toBe(false);
  });

  it('rejects negative maxAge', () => {
    expect(FieldDtoSchema.safeParse({ ...base, maxAge: -5 }).success).toBe(false);
  });

  it('rejects non-integer minAge', () => {
    expect(FieldDtoSchema.safeParse({ ...base, minAge: 18.5 }).success).toBe(false);
  });

  it('omits minAge (optional)', () => {
    const result = FieldDtoSchema.safeParse({ ...base });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.minAge).toBeUndefined();
  });

  // QA-001: optional fields absent
  it('omits maxDate (optional)', () => {
    const result = FieldDtoSchema.safeParse({ ...base, minDate: '2000-01-01' });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.maxDate).toBeUndefined();
  });

  it('omits maxAge (optional)', () => {
    const result = FieldDtoSchema.safeParse({ ...base, minAge: 18 });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.maxAge).toBeUndefined();
  });

  // QA-002: non-integer maxAge
  it('rejects non-integer maxAge', () => {
    expect(FieldDtoSchema.safeParse({ ...base, maxAge: 0.5 }).success).toBe(false);
  });

  // RC-001: semantically invalid dates
  it('rejects semantically invalid minDate', () => {
    expect(FieldDtoSchema.safeParse({ ...base, minDate: '2000-99-99' }).success).toBe(false);
  });

  it('rejects semantically invalid maxDate', () => {
    expect(FieldDtoSchema.safeParse({ ...base, maxDate: '2000-02-30' }).success).toBe(false);
  });

  // RC-002: ordering constraints
  it('rejects minDate > maxDate', () => {
    expect(FieldDtoSchema.safeParse({ ...base, minDate: '2025-12-31', maxDate: '2020-01-01' }).success).toBe(false);
  });

  it('accepts minDate == maxDate', () => {
    expect(FieldDtoSchema.safeParse({ ...base, minDate: '2025-06-15', maxDate: '2025-06-15' }).success).toBe(true);
  });

  it('rejects minAge > maxAge', () => {
    expect(FieldDtoSchema.safeParse({ ...base, minAge: 65, maxAge: 18 }).success).toBe(false);
  });

  it('accepts minAge == maxAge', () => {
    expect(FieldDtoSchema.safeParse({ ...base, minAge: 18, maxAge: 18 }).success).toBe(true);
  });

  // displayFormat
  it('accepts valid displayFormat dd-mm-yyyy', () => {
    const result = FieldDtoSchema.safeParse({ ...base, displayFormat: 'dd-mm-yyyy' });
    expect(result.success).toBe(true);
  });

  it('accepts valid displayFormat mm/dd/yyyy', () => {
    const result = FieldDtoSchema.safeParse({ ...base, displayFormat: 'mm/dd/yyyy' });
    expect(result.success).toBe(true);
  });

  it('accepts valid displayFormat yyyy.mm.dd', () => {
    const result = FieldDtoSchema.safeParse({ ...base, displayFormat: 'yyyy.mm.dd' });
    expect(result.success).toBe(true);
  });

  it('omits displayFormat (optional)', () => {
    const result = FieldDtoSchema.safeParse({ ...base });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'date-picker') expect(result.data.displayFormat).toBeUndefined();
  });

  it('rejects displayFormat with missing token (no yyyy)', () => {
    expect(FieldDtoSchema.safeParse({ ...base, displayFormat: 'dd-mm-dd' }).success).toBe(false);
  });

  it('rejects displayFormat with repeated token', () => {
    expect(FieldDtoSchema.safeParse({ ...base, displayFormat: 'dd-dd-yyyy' }).success).toBe(false);
  });

  it('rejects displayFormat with digit separator', () => {
    expect(FieldDtoSchema.safeParse({ ...base, displayFormat: 'dd1mm1yyyy' }).success).toBe(false);
  });

  it('rejects displayFormat missing separator', () => {
    expect(FieldDtoSchema.safeParse({ ...base, displayFormat: 'ddmmyyyy' }).success).toBe(false);
  });

  it('rejects displayFormat with unsupported token (yy instead of yyyy)', () => {
    expect(FieldDtoSchema.safeParse({ ...base, displayFormat: 'dd-mm-yy' }).success).toBe(false);
  });

  it('rejects displayFormat with multi-character separator', () => {
    expect(FieldDtoSchema.safeParse({ ...base, displayFormat: 'dd--mm-yyyy' }).success).toBe(false);
  });

  it('rejects empty string displayFormat', () => {
    expect(FieldDtoSchema.safeParse({ ...base, displayFormat: '' }).success).toBe(false);
  });
});

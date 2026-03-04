import { parseDisplayDate, formatIsoDate } from './date-format.util';

describe('parseDisplayDate', () => {
  // Valid cases
  it('parses dd-mm-yyyy format correctly', () => {
    expect(parseDisplayDate('15-03-2024', 'dd-mm-yyyy')).toBe('2024-03-15');
  });

  it('parses mm/dd/yyyy format correctly', () => {
    expect(parseDisplayDate('03/15/2024', 'mm/dd/yyyy')).toBe('2024-03-15');
  });

  it('parses yyyy.mm.dd format correctly', () => {
    expect(parseDisplayDate('2024.03.15', 'yyyy.mm.dd')).toBe('2024-03-15');
  });

  it('pads single-digit day and month in output', () => {
    expect(parseDisplayDate('01-01-2024', 'dd-mm-yyyy')).toBe('2024-01-01');
  });

  it('accepts Feb 29 on leap year', () => {
    expect(parseDisplayDate('29-02-2024', 'dd-mm-yyyy')).toBe('2024-02-29');
  });

  it('accepts Feb 28 on non-leap year', () => {
    expect(parseDisplayDate('28-02-2023', 'dd-mm-yyyy')).toBe('2023-02-28');
  });

  // Invalid cases
  it('returns null for Feb 29 on non-leap year', () => {
    expect(parseDisplayDate('29-02-2023', 'dd-mm-yyyy')).toBeNull();
  });

  it('returns null for Feb 30', () => {
    expect(parseDisplayDate('30-02-2024', 'dd-mm-yyyy')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDisplayDate('', 'dd-mm-yyyy')).toBeNull();
  });

  it('returns null for null-like input', () => {
    expect(parseDisplayDate('', 'dd-mm-yyyy')).toBeNull();
  });

  it('returns null for month > 12', () => {
    expect(parseDisplayDate('15-13-2024', 'dd-mm-yyyy')).toBeNull();
  });

  it('returns null for day 0', () => {
    expect(parseDisplayDate('00-01-2024', 'dd-mm-yyyy')).toBeNull();
  });

  it('returns null for non-numeric parts', () => {
    expect(parseDisplayDate('ab-cd-efgh', 'dd-mm-yyyy')).toBeNull();
  });

  it('returns null for wrong separator count', () => {
    expect(parseDisplayDate('1503-2024', 'dd-mm-yyyy')).toBeNull();
  });

  it('returns null for empty format', () => {
    expect(parseDisplayDate('15-03-2024', '')).toBeNull();
  });
});

describe('formatIsoDate', () => {
  it('formats ISO to dd-mm-yyyy', () => {
    expect(formatIsoDate('2024-03-15', 'dd-mm-yyyy')).toBe('15-03-2024');
  });

  it('formats ISO to mm/dd/yyyy', () => {
    expect(formatIsoDate('2024-03-15', 'mm/dd/yyyy')).toBe('03/15/2024');
  });

  it('formats ISO to yyyy.mm.dd', () => {
    expect(formatIsoDate('2024-03-15', 'yyyy.mm.dd')).toBe('2024.03.15');
  });

  it('returns empty string for null iso', () => {
    expect(formatIsoDate(null, 'dd-mm-yyyy')).toBe('');
  });

  it('returns empty string for undefined iso', () => {
    expect(formatIsoDate(undefined, 'dd-mm-yyyy')).toBe('');
  });

  it('returns empty string for empty iso string', () => {
    expect(formatIsoDate('', 'dd-mm-yyyy')).toBe('');
  });

  it('pads single-digit months and days', () => {
    expect(formatIsoDate('2024-01-05', 'dd-mm-yyyy')).toBe('05-01-2024');
  });
});

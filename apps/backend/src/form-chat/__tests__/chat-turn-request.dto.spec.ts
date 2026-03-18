import { ChatTurnRequestSchema } from '../dto/chat-turn-request.dto';

const VALID_UUID = '12345678-1234-4234-8234-123456789012';

function validate(input: unknown) {
  return ChatTurnRequestSchema.safeParse(input);
}

describe('ChatTurnRequestSchema', () => {
  // --- Valid inputs ---

  it('passes with message only', () => {
    const result = validate({ message: 'hello' });
    expect(result.success).toBe(true);
  });

  it('passes with attachments only, no message (UD-001 file-only turn)', () => {
    const result = validate({ attachmentFileIds: [VALID_UUID] });
    expect(result.success).toBe(true);
  });

  it('passes with both message and attachments', () => {
    const result = validate({ message: 'hello', attachmentFileIds: [VALID_UUID] });
    expect(result.success).toBe(true);
  });

  it('passes with empty message when attachmentFileIds is non-empty', () => {
    const result = validate({ message: '', attachmentFileIds: [VALID_UUID] });
    expect(result.success).toBe(true);
  });

  it('passes with message exactly 10,000 characters', () => {
    const result = validate({ message: 'a'.repeat(10000) });
    expect(result.success).toBe(true);
  });

  // --- Invalid inputs ---

  it('fails when neither message nor attachments are provided (combined-presence violation)', () => {
    const result = validate({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain('message');
  });

  it('fails when message is empty and no attachments (combined-presence violation)', () => {
    const result = validate({ message: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain('message');
  });

  it('fails when message exceeds 10,000 characters', () => {
    const result = validate({ message: 'a'.repeat(10001) });
    expect(result.success).toBe(false);
  });

  it('fails when unknown fields are present (.strict())', () => {
    const result = validate({ message: 'hello', unknownField: 'x' });
    expect(result.success).toBe(false);
  });

  it('fails when message is a number instead of a string', () => {
    const result = validate({ message: 123 });
    expect(result.success).toBe(false);
  });

  it('fails when message is null (type error, not treated as absent)', () => {
    const result = validate({ message: null });
    expect(result.success).toBe(false);
  });

  // S-001 regression: MaxLength is unconditional — attachments do not bypass the length check
  it('fails when message exceeds 10,000 chars even when attachments are provided', () => {
    const result = validate({ message: 'a'.repeat(10001), attachmentFileIds: [VALID_UUID] });
    expect(result.success).toBe(false);
  });

  it('fails when sync:false is present (.strict() rejects unknown key)', () => {
    const result = validate({ sync: false });
    expect(result.success).toBe(false);
  });

  it('fails when sync:string is present (.strict() rejects unknown key)', () => {
    const result = validate({ sync: 'yes' });
    expect(result.success).toBe(false);
  });

  it('fails when { sync: true } is passed without message or attachments (AC-1: sync field removed, normal validation applies)', () => {
    const result = validate({ sync: true });
    expect(result.success).toBe(false);
  });
});

import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../zod-validation.pipe';

const schema = z.object({ name: z.string() }).strict();

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe<{ name: string }>;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('returns parsed data for valid input', () => {
    const result = pipe.transform({ name: 'Alice' });
    expect(result).toEqual({ name: 'Alice' });
  });

  it('throws BadRequestException when a required field is missing', () => {
    const invalidInput = {};
    try {
      pipe.transform(invalidInput);
      fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toEqual(
        schema.safeParse(invalidInput).error!.flatten()
      );
    }
  });

  it('throws BadRequestException when a field has the wrong type', () => {
    expect(() => pipe.transform({ name: 42 })).toThrow(BadRequestException);
  });

  it('throws BadRequestException for an unknown field (strict mode)', () => {
    expect(() => pipe.transform({ name: 'Bob', extra: true })).toThrow(BadRequestException);
  });

  it('throws BadRequestException when value is not an object', () => {
    expect(() => pipe.transform('not-an-object')).toThrow(BadRequestException);
  });
});

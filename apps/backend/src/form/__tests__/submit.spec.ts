import { UnprocessableEntityException, ConflictException } from '@nestjs/common';
import { FormService } from '../form.service';
import type { FieldDto } from '@formrig/shared';
import type { Form } from '../entities/form.entity';
import type { User } from '../../dev-auth/entities/user.entity';

const mockUser = { id: 'user-1' } as User;

// ── Minimal mock helpers ─────────────────────────────────────────────────────

/** Builds a minimal Form entity stub with a flush-capable EntityManager mock. */
function buildFormStub(overrides: Partial<Form> = {}): Form {
  return {
    id: 'form-1',
    pluginId: 'demo-form',
    values: {},
    submittedAt: null,
    fileRecords: { getItems: () => [] } as unknown as Form['fileRecords'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as unknown as Form;
}

/** Builds a minimal text FieldDto with sensible defaults. */
const textField = (overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'name-0',
    type: 'text',
    label: 'Name',
    required: false,
    disabled: false,
    value: 'Alice',
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

/** Creates a FormService instance with all dependencies stubbed to no-ops. */
function buildService(): { svc: FormService; emMock: { flush: jest.Mock } } {
  const emMock = { flush: jest.fn().mockResolvedValue(undefined) };
  const svc = new FormService(
    {} as never, // formRepo — not called in submitForm directly
    {} as never, // fileRepo
    emMock as never,
    {} as never, // pluginSvc
    {} as never, // fileStorage
  );
  // findOwnedForm is always mocked by the per-test buildFlatFieldDtos spy; stub it to resolve.
  jest.spyOn(svc, 'findOwnedForm').mockResolvedValue({} as Form);
  return { svc, emMock };
}

// ── Test suites ──────────────────────────────────────────────────────────────

describe('FormService.submitForm', () => {
  it('returns submittedAt and sets form.submittedAt when all fields are valid with no rules', async () => {
    const { svc, emMock } = buildService();
    const form = buildFormStub();
    const fieldMap = new Map<string, FieldDto>([
      ['name-0', textField({ required: false, value: 'Alice' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    const result = await svc.submitForm('form-1', mockUser);

    expect(result.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(form.submittedAt).toBeInstanceOf(Date);
    expect(emMock.flush).toHaveBeenCalledTimes(1);
  });

  it('throws UnprocessableEntityException with violations when a required field is empty', async () => {
    const { svc, emMock } = buildService();
    const form = buildFormStub();
    const fieldMap = new Map<string, FieldDto>([
      ['name-0', textField({ id: 'name-0', required: true, value: '' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    let err!: UnprocessableEntityException;
    try {
      await svc.submitForm('form-1', mockUser);
    } catch (e) {
      err = e as UnprocessableEntityException;
    }

    expect(err).toBeInstanceOf(UnprocessableEntityException);
    const body = err.getResponse() as { message: string; errors: { fieldId: string; violations: string[] }[] };
    expect(body).toEqual(
      expect.objectContaining({
        message: 'Soft validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            fieldId: 'name-0',
            violations: expect.arrayContaining([expect.stringContaining('')]),
          }),
        ]),
      }),
    );
    expect(emMock.flush).not.toHaveBeenCalled();
  });

  it('includes all violations when multiple fields fail rules', async () => {
    const { svc } = buildService();
    const form = buildFormStub();
    const fieldMap = new Map<string, FieldDto>([
      ['first-0', textField({ id: 'first-0', required: true, value: '' })],
      ['last-1',  textField({ id: 'last-1',  required: true, value: '' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    let err!: UnprocessableEntityException;
    try {
      await svc.submitForm('form-1', mockUser);
    } catch (e) {
      err = e as UnprocessableEntityException;
    }
    expect(err).toBeInstanceOf(UnprocessableEntityException);

    const body = err.getResponse() as { message: string; errors: { fieldId: string; violations: string[] }[] };
    expect(body).toEqual(
      expect.objectContaining({
        message: 'Soft validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ fieldId: 'first-0', violations: expect.arrayContaining([expect.stringContaining('')]) }),
          expect.objectContaining({ fieldId: 'last-1',  violations: expect.arrayContaining([expect.stringContaining('')]) }),
        ]),
      }),
    );
    expect(body.errors).toHaveLength(2);
  });

  it('skips file-upload fields — no violation even if value is null with required: true', async () => {
    const { svc } = buildService();
    const form = buildFormStub();
    const fieldMap = new Map<string, FieldDto>([
      // file-upload with required:true and null value — must be skipped, NOT flagged
      ['doc-0', fileUploadField({ id: 'doc-0', required: true })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    await expect(svc.submitForm('form-1', mockUser)).resolves.toMatchObject({
      submittedAt: expect.any(String),
    });
  });

  it('throws ConflictException when form.submittedAt is already set', async () => {
    const { svc, emMock } = buildService();
    const form = buildFormStub({ submittedAt: new Date('2026-02-01T00:00:00.000Z') });
    const fieldMap = new Map<string, FieldDto>();
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    await expect(svc.submitForm('form-1', mockUser)).rejects.toBeInstanceOf(ConflictException);
    expect(emMock.flush).not.toHaveBeenCalled();
  });

  it('returns submittedAt without error when the form has no fields', async () => {
    const { svc } = buildService();
    const form = buildFormStub();
    const fieldMap = new Map<string, FieldDto>();
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    const result = await svc.submitForm('form-1', mockUser);

    expect(result.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws UnprocessableEntityException with a maxCharacters violation when value exceeds the limit', async () => {
    const { svc, emMock } = buildService();
    const form = buildFormStub();
    const fieldMap = new Map<string, FieldDto>([
      ['name-0', textField({ id: 'name-0', maxCharacters: 3, value: 'toolong' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    let err!: UnprocessableEntityException;
    try {
      await svc.submitForm('form-1', mockUser);
    } catch (e) {
      err = e as UnprocessableEntityException;
    }

    expect(err).toBeInstanceOf(UnprocessableEntityException);
    const body = err.getResponse() as { message: string; errors: { fieldId: string; violations: string[] }[] };
    expect(body).toEqual(
      expect.objectContaining({
        message: 'Soft validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            fieldId: 'name-0',
            violations: expect.arrayContaining([expect.stringContaining('3')]),
          }),
        ]),
      }),
    );
    expect(emMock.flush).not.toHaveBeenCalled();
  });

  describe('cross-field rule — EqualsFieldRule', () => {
    /** Builds a two-field map where email-confirm-1 has an EqualsFieldRule pointing to email-0. */
    function buildCrossFieldMap(emailConfirmValue: string): Map<string, FieldDto> {
      return new Map<string, FieldDto>([
        ['email-0', textField({ id: 'email-0', value: 'a@example.com' })],
        [
          'email-confirm-1',
          // Spread the base textField and add rules as a plain RuleDto[] (converted by ruleFromDto inside getEffectiveRules)
          {
            ...textField({ id: 'email-confirm-1', value: emailConfirmValue }),
            rules: [{ type: 'equals-field', fieldId: 'email-0' }],
          } as FieldDto,
        ],
      ]);
    }

    it('passes when email-confirm matches email (same value → no violation)', async () => {
      const { svc } = buildService();
      const form = buildFormStub();
      jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({
        fieldMap: buildCrossFieldMap('a@example.com'),
        form,
      });

      await expect(svc.submitForm('form-1', mockUser)).resolves.toMatchObject({
        submittedAt: expect.any(String),
      });
    });

    it('throws 422 for email-confirm-1 when its value differs from email-0', async () => {
      const { svc, emMock } = buildService();
      const form = buildFormStub();
      jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({
        fieldMap: buildCrossFieldMap('b@example.com'),
        form,
      });

      let err!: UnprocessableEntityException;
      try {
        await svc.submitForm('form-1', mockUser);
      } catch (e) {
        err = e as UnprocessableEntityException;
      }

      expect(err).toBeInstanceOf(UnprocessableEntityException);
      const body = err.getResponse() as { message: string; errors: { fieldId: string; violations: string[] }[] };
      expect(body.message).toBe('Soft validation failed');
      expect(body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fieldId: 'email-confirm-1',
            violations: expect.arrayContaining([expect.stringContaining('email-0')]),
          }),
        ]),
      );
      expect(body.errors).toHaveLength(1);
      expect(emMock.flush).not.toHaveBeenCalled();
    });
  });
});

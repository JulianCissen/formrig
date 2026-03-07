import { ConflictException } from '@nestjs/common';
import { FormService } from '../form.service';
import type { FieldDto } from '@formrig/shared';
import type { Form } from '../entities/form.entity';
import type { User } from '../../dev-auth/entities/user.entity';

const mockUser = { id: 'user-1' } as User;

// ── Minimal mock helpers ─────────────────────────────────────────────────────

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

function buildService(): { svc: FormService; emMock: { flush: jest.Mock } } {
  const emMock = { flush: jest.fn().mockResolvedValue(undefined) };
  const svc = new FormService(
    {} as never,
    {} as never,
    emMock as never,
    {} as never,
    {} as never,
  );
  return { svc, emMock };
}

const SUBMITTED_FORM = buildFormStub({ submittedAt: new Date('2026-02-01T00:00:00.000Z') });

// ── patchForm ────────────────────────────────────────────────────────────────

describe('FormService.patchForm — immutability guard', () => {
  it('throws ConflictException (409) when form.submittedAt is non-null', async () => {
    const { svc, emMock } = buildService();

    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(SUBMITTED_FORM);

    await expect(
      svc.patchForm('form-1', { fieldId: 'name-0', value: 'Alice' }, mockUser),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(emMock.flush).not.toHaveBeenCalled();
  });
});

// ── createFileRecord ─────────────────────────────────────────────────────────

describe('FormService.createFileRecord — immutability guard', () => {
  it('throws ConflictException (409) when form.submittedAt is non-null', async () => {
    const { svc, emMock } = buildService();

    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(SUBMITTED_FORM);

    await expect(
      svc.createFileRecord(
        'form-1',
        'doc-0',
        'storage/key',
        { originalName: 'file.txt', mimeType: 'text/plain', size: 10 },
        mockUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(emMock.flush).not.toHaveBeenCalled();
  });
});

// ── deleteFileRecord ─────────────────────────────────────────────────────────

describe('FormService.deleteFileRecord — immutability guard', () => {
  it('throws ConflictException (409) when form.submittedAt is non-null', async () => {
    const { svc, emMock } = buildService();

    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(SUBMITTED_FORM);

    await expect(
      svc.deleteFileRecord('form-1', 'file-id-1', mockUser),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(emMock.flush).not.toHaveBeenCalled();
  });
});

// ── getForm — submittedAt in response ────────────────────────────────────────

describe('FormService.getForm — submittedAt exposure', () => {
  it('returns submittedAt as ISO string when form has been submitted', async () => {
    const { svc } = buildService();

    const submittedAt = new Date('2026-02-01T00:00:00.000Z');
    const form = buildFormStub({ submittedAt });

    // Stub formRepo.findOne to return the submitted form with fileRecords populated
    (svc as any).formRepo = {
      findOne: jest.fn().mockResolvedValue({
        ...form,
        fileRecords: { getItems: () => [] },
      }),
    };

    // Stub pluginSvc.find to return a minimal plugin definition
    (svc as any).pluginSvc = {
      find: jest.fn().mockReturnValue({
        manifest: { name: 'demo-form', version: '1.0.0' },
        plugin: {
          definition: {
            id: 'demo-form',
            title: 'Demo Form',
            fields: [],
          },
          events: {
            created: jest.fn().mockResolvedValue(undefined),
          },
        },
      }),
    };

    const result = await svc.getForm('form-1', mockUser);

    expect(result.submittedAt).toBe(submittedAt.toISOString());
  });

  it('returns submittedAt as null when form has not been submitted', async () => {
    const { svc } = buildService();

    const form = buildFormStub({ submittedAt: null });

    (svc as any).formRepo = {
      findOne: jest.fn().mockResolvedValue({
        ...form,
        fileRecords: { getItems: () => [] },
      }),
    };

    (svc as any).pluginSvc = {
      find: jest.fn().mockReturnValue({
        manifest: { name: 'demo-form', version: '1.0.0' },
        plugin: {
          definition: {
            id: 'demo-form',
            title: 'Demo Form',
            fields: [],
          },
          events: {
            created: jest.fn().mockResolvedValue(undefined),
          },
        },
      }),
    };

    const result = await svc.getForm('form-1', mockUser);

    expect(result.submittedAt).toBeNull();
  });
});

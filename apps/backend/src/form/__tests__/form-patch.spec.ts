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
    unconfirmedFieldIds: [],
    fileRecords: { getItems: () => [] } as unknown as Form['fileRecords'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as unknown as Form;
}

const textField = (overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'name-0',
    type: 'text',
    label: 'Name',
    required: false,
    disabled: false,
    value: '',
    ...overrides,
  }) as FieldDto;

const fileUploadField = (overrides: Partial<FieldDto> = {}): FieldDto =>
  ({
    id: 'photo-0',
    type: 'file-upload',
    label: 'Photo',
    required: false,
    disabled: false,
    ...overrides,
  }) as FieldDto;

function buildService(): {
  svc: FormService;
  emMock: { flush: jest.Mock; persist: jest.Mock };
  fileRepo: { create: jest.Mock };
} {
  const emMock = { flush: jest.fn().mockResolvedValue(undefined), persist: jest.fn() };
  const fileRepo = { create: jest.fn() };
  const pluginSvc = { find: jest.fn().mockReturnValue(undefined) };
  const svc = new FormService(
    {} as never,
    fileRepo as never,
    emMock as never,
    pluginSvc as never,
    {} as never,
  );
  return { svc, emMock, fileRepo };
}

// ── AC-3: Single-field PATCH drain ───────────────────────────────────────────

describe('FormService.patchForm — single-field drain (AC-3)', () => {
  it('removes the patched fieldId from form.unconfirmedFieldIds', async () => {
    const { svc, emMock } = buildService();
    const form = buildFormStub({ unconfirmedFieldIds: ['name-0', 'email-1'] });
    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(form);
    const fieldMap = new Map<string, FieldDto>([
      ['name-0',  textField({ id: 'name-0' })],
      ['email-1', textField({ id: 'email-1', label: 'Email' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    await svc.patchForm('form-1', { fieldId: 'name-0', value: 'Alice' }, mockUser);

    expect(form.unconfirmedFieldIds).toEqual(['email-1']);
    expect(emMock.flush).toHaveBeenCalledTimes(1);
  });
});

// ── AC-4: Batch PATCH drain ──────────────────────────────────────────────────

describe('FormService.patchForm — batch drain (AC-4)', () => {
  it('removes all batch-patched keys from form.unconfirmedFieldIds', async () => {
    const { svc, emMock } = buildService();
    const form = buildFormStub({ unconfirmedFieldIds: ['name-0', 'email-1', 'notes-2'] });
    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(form);
    const fieldMap = new Map<string, FieldDto>([
      ['name-0',  textField({ id: 'name-0' })],
      ['email-1', textField({ id: 'email-1', label: 'Email' })],
      ['notes-2', textField({ id: 'notes-2', label: 'Notes' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    await svc.patchForm('form-1', { values: { 'name-0': 'Alice', 'email-1': 'a@b.com' } }, mockUser);

    expect(form.unconfirmedFieldIds).toEqual(['notes-2']);
    expect(emMock.flush).toHaveBeenCalledTimes(1);
  });

  it('does not drain file-upload fields from batch PATCH', async () => {
    const { svc } = buildService();
    const form = buildFormStub({ unconfirmedFieldIds: ['photo-0', 'name-1'] });
    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(form);
    const fieldMap = new Map<string, FieldDto>([
      ['photo-0', fileUploadField({ id: 'photo-0' })],
      ['name-1',  textField({ id: 'name-1', label: 'Name' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    await svc.patchForm('form-1', { values: { 'photo-0': ['fileId'] } }, mockUser);

    expect(form.unconfirmedFieldIds).toContain('photo-0');
  });
});

// ── AC-5: createFileRecord drain ─────────────────────────────────────────────

describe('FormService.createFileRecord — drain (AC-5)', () => {
  it('removes the fieldId from form.unconfirmedFieldIds after file record creation', async () => {
    const { svc, emMock, fileRepo } = buildService();
    const form = buildFormStub({ unconfirmedFieldIds: ['photo-0', 'name-1'] });
    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(form);
    const fieldMap = new Map<string, FieldDto>([
      ['photo-0', fileUploadField({ id: 'photo-0' })],
      ['name-1',  textField({ id: 'name-1' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });
    fileRepo.create.mockReturnValue({
      id: 'file-1',
      fieldId: 'photo-0',
      filename: 'photo_0.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });

    await svc.createFileRecord(
      'form-1',
      'photo-0',
      'storage/key/photo_0.jpg',
      { originalName: 'photo.jpg', mimeType: 'image/jpeg', size: 1024 },
      mockUser,
    );

    expect(form.unconfirmedFieldIds).toEqual(['name-1']);
    expect(emMock.flush).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestException when fieldId does not exist on the form', async () => {
    const { svc, fileRepo } = buildService();
    const form = buildFormStub({ unconfirmedFieldIds: [] });
    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(form);
    const fieldMap = new Map<string, FieldDto>([
      ['name-0', textField({ id: 'name-0' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    await expect(
      svc.createFileRecord('form-1', 'no-such-field', 'key', { originalName: 'f.jpg', mimeType: 'image/jpeg', size: 1 }, mockUser),
    ).rejects.toThrow('does not exist on this form');
    expect(fileRepo.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when fieldId refers to a non-file-upload field', async () => {
    const { svc, fileRepo } = buildService();
    const form = buildFormStub({ unconfirmedFieldIds: [] });
    jest.spyOn(svc, 'findOwnedForm').mockResolvedValue(form);
    const fieldMap = new Map<string, FieldDto>([
      ['name-0', textField({ id: 'name-0' })],
    ]);
    jest.spyOn(svc as any, 'buildFlatFieldDtos').mockResolvedValue({ fieldMap, form });

    await expect(
      svc.createFileRecord('form-1', 'name-0', 'key', { originalName: 'f.jpg', mimeType: 'image/jpeg', size: 1 }, mockUser),
    ).rejects.toThrow('is not a file-upload field');
    expect(fileRepo.create).not.toHaveBeenCalled();
  });
});

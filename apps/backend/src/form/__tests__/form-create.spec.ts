import { NotFoundException } from '@nestjs/common';
import { FormService } from '../form.service';
import { CheckboxField, TextField, FileUploadField } from '@formrig/shared';
import type { BaseField } from '@formrig/shared';
import type { FormTypePlugin } from '@formrig/sdk';
import type { User } from '../../dev-auth/entities/user.entity';
import type { Form } from '../entities/form.entity';

const mockUser = { id: 'user-1' } as User;

// ── Minimal mock helpers ─────────────────────────────────────────────────────

function buildService(pluginSvcMock: { find: jest.Mock }): {
  svc: FormService;
  formRepo: { create: jest.Mock };
  emMock: { persist: jest.Mock; flush: jest.Mock };
} {
  const formRepo = {
    create: jest.fn().mockImplementation((data: unknown) => ({ ...(data as object) } as Form)),
  };
  const emMock = {
    persist: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  };
  const svc = new FormService(
    formRepo as never,
    {} as never,
    emMock as never,
    pluginSvcMock as never,
    {} as never,
  );
  return { svc, formRepo, emMock };
}

function buildPlugin(
  fields: BaseField[],
  createdHandler: (ctx: { fields: BaseField[] }) => Promise<void> = async () => {},
): { manifest: { name: string; version: string }; plugin: FormTypePlugin } {
  return {
    manifest: { name: 'test-plugin', version: '1.0.0' },
    plugin: {
      definition: {
        id: 'test-form',
        fields,
      },
      events: {
        created: jest.fn().mockImplementation(createdHandler),
        submitted: jest.fn().mockResolvedValue(undefined),
      },
    },
  };
}

// ── createForm initialization: checkbox defaults ──────────────────────────────

describe('FormService.createForm — initialization logic', () => {
  it('sets checkbox field values to false when events.created does not set them', async () => {
    // CheckboxField defaults value to false; events.created is a no-op
    const checkboxField = new CheckboxField({ label: 'Agree' });
    const pluginSvcMock = { find: jest.fn().mockReturnValue(buildPlugin([checkboxField])) };
    const { svc, formRepo } = buildService(pluginSvcMock);

    await svc.createForm({ pluginId: 'test-plugin' }, mockUser);

    const capturedValues = formRepo.create.mock.calls[0][0].values as Record<string, unknown>;
    expect(capturedValues['agree-0']).toBe(false);
    const capturedUnconfirmed = formRepo.create.mock.calls[0][0].unconfirmedFieldIds as string[];
    expect(capturedUnconfirmed).toEqual(['agree-0']);
  });

  it('persists values set by events.created in form.values', async () => {
    const textField = new TextField({ label: 'Name' });
    const pluginSvcMock = {
      find: jest.fn().mockReturnValue(
        buildPlugin([textField], async (ctx) => {
          (ctx.fields[0] as unknown as Record<string, unknown>)['value'] = 'Hello';
        }),
      ),
    };
    const { svc, formRepo } = buildService(pluginSvcMock);

    await svc.createForm({ pluginId: 'test-plugin' }, mockUser);

    const capturedValues = formRepo.create.mock.calls[0][0].values as Record<string, unknown>;
    expect(capturedValues['name-0']).toBe('Hello');
    const capturedUnconfirmed = formRepo.create.mock.calls[0][0].unconfirmedFieldIds as string[];
    expect(capturedUnconfirmed).toEqual(['name-0']);
  });

  it('does not overwrite a checkbox value explicitly set by events.created', async () => {
    const checkboxField = new CheckboxField({ label: 'Agree' });
    const pluginSvcMock = {
      find: jest.fn().mockReturnValue(
        buildPlugin([checkboxField], async (ctx) => {
          (ctx.fields[0] as unknown as Record<string, unknown>)['value'] = true;
        }),
      ),
    };
    const { svc, formRepo } = buildService(pluginSvcMock);

    await svc.createForm({ pluginId: 'test-plugin' }, mockUser);

    const capturedValues = formRepo.create.mock.calls[0][0].values as Record<string, unknown>;
    expect(capturedValues['agree-0']).toBe(true);
    const capturedUnconfirmed = formRepo.create.mock.calls[0][0].unconfirmedFieldIds as string[];
    expect(capturedUnconfirmed).toEqual(['agree-0']);
  });

  it('seeds unconfirmedFieldIds as empty array when no fields are pre-populated', async () => {
    // FileUploadField has no value property → initialValues stays empty → unconfirmedFieldIds: []
    const uploadField = new FileUploadField({ label: 'Document' });
    const pluginSvcMock = { find: jest.fn().mockReturnValue(buildPlugin([uploadField])) };
    const { svc, formRepo } = buildService(pluginSvcMock);

    await svc.createForm({ pluginId: 'test-plugin' }, mockUser);

    const capturedUnconfirmed = formRepo.create.mock.calls[0][0].unconfirmedFieldIds as string[];
    expect(capturedUnconfirmed).toEqual([]);
  });
});

// ── createForm: plugin not found ───────────────────────────────────────────

describe('FormService.createForm — plugin validation', () => {
  it('throws NotFoundException when plugin is not loaded', async () => {
    const pluginSvcMock = { find: jest.fn().mockReturnValue(undefined) };
    const { svc } = buildService(pluginSvcMock);

    await expect(
      svc.createForm({ pluginId: 'missing-plugin' }, mockUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import request from 'supertest';

import { FormsController } from '../forms.controller';
import { FormService } from '../form.service';
import { FilePipelineService } from '../../file-storage/file-pipeline.service';
import type { User } from '../../dev-auth/entities/user.entity';

// ── Test fixtures ────────────────────────────────────────────────────────────

const FORM_ID = '00000000-0000-0000-0000-000000000001';
const FILE_ID = '00000000-0000-0000-0000-000000000002';

const ownerUser = { id: 'user-owner', sub: 'owner-sub', claims: {} } as unknown as User;
const otherUser = { id: 'user-other', sub: 'other-sub', claims: {} } as unknown as User;

const mockFormSummary = {
  id: FORM_ID,
  title: 'Test Form',
  pluginId: 'demo-form',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// Intentionally minimal — tests do not assert full FormDetailDto shape
const mockFormDetail = {
  ...mockFormSummary,
  steps: [],
  fileRecords: [],
};

const mockFileRecord = {
  id: FILE_ID,
  fieldId: 'field-0',
  storageKey: 'forms/test/file-key',
  mimeType: 'text/plain',
  originalName: 'test.txt',
  size: 12,
  createdAt: '2026-01-01T00:00:00.000Z',
};

// ── Suite ────────────────────────────────────────────────────────────────────

describe('FormsController ownership (AC-1–AC-15)', () => {
  let app: INestApplication;
  let formService: jest.Mocked<FormService>;
  let currentUser: User | null;

  beforeEach(async () => {
    currentUser = ownerUser;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [FormsController],
      providers: [
        {
          provide: FormService,
          useValue: {
            createForm:       jest.fn().mockResolvedValue(mockFormSummary),
            listForms:        jest.fn().mockResolvedValue([mockFormSummary]),
            getFormTypes:     jest.fn().mockReturnValue([]),
            getForm:          jest.fn().mockResolvedValue(mockFormDetail),
            patchForm:        jest.fn().mockResolvedValue(mockFormSummary),
            deleteForm:       jest.fn().mockResolvedValue(undefined),
            submitForm:       jest.fn().mockResolvedValue({ submittedAt: '2026-01-01T00:00:00.000Z' }),
            createFileRecord: jest.fn().mockResolvedValue(mockFileRecord),
            getFileStream:    jest.fn().mockResolvedValue({
              stream:   Readable.from(['test data']),
              mimeType: 'text/plain',
              filename: 'test.txt',
            }),
            deleteFileRecord: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: FilePipelineService,
          useValue: { process: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    // Inject req.currentUser via middleware so RequireAuthGuard and @CurrentUser() work.
    app = moduleRef.createNestApplication();
    app.use((req: any, _res: any, next: any) => {
      req.currentUser = currentUser;
      next();
    });
    await app.init();

    formService = moduleRef.get(FormService) as jest.Mocked<FormService>;
  });

  afterEach(async () => {
    await app.close();
  });

  // AC-1 (TypeScript build passes) is verified externally:
  //   cd apps/backend && npx tsc -p tsconfig.build.json --noEmit

  // ── POST /forms ─────────────────────────────────────────────────────────────

  describe('POST /forms', () => {
    it('AC-2 — returns 201 and delegates createForm(dto, ownerUser) when authenticated', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer())
        .post('/forms')
        .send({ pluginId: 'demo-form' });

      expect(res.status).toBe(201);
      expect(formService.createForm).toHaveBeenCalledWith({ pluginId: 'demo-form' }, ownerUser);
    });

    it('AC-3 — returns 401 when currentUser is null', async () => {
      currentUser = null;

      const res = await request(app.getHttpServer())
        .post('/forms')
        .send({ pluginId: 'demo-form' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /forms ──────────────────────────────────────────────────────────────

  describe('GET /forms', () => {
    it('AC-4 — returns only listForms(ownerUser) results when authenticated', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer()).get('/forms');

      expect(res.status).toBe(200);
      expect(formService.listForms).toHaveBeenCalledWith(ownerUser);
      expect(res.body).toEqual([mockFormSummary]);
    });

    it('AC-5 — returns 401 when currentUser is null', async () => {
      currentUser = null;

      const res = await request(app.getHttpServer()).get('/forms');

      expect(res.status).toBe(401);
    });
  });

  // ── GET /forms/types ────────────────────────────────────────────────────────

  describe('GET /forms/types', () => {
    it('AC-6 — returns 401 when currentUser is null', async () => {
      currentUser = null;

      const res = await request(app.getHttpServer()).get('/forms/types');

      expect(res.status).toBe(401);
    });

    it('AC-7 — returns 200 when authenticated', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer()).get('/forms/types');

      expect(res.status).toBe(200);
    });
  });

  // ── GET /forms/:id ──────────────────────────────────────────────────────────

  describe('GET /forms/:id', () => {
    it('AC-8 — returns 200 for the form owner', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer()).get(`/forms/${FORM_ID}`);

      expect(res.status).toBe(200);
      expect(formService.getForm).toHaveBeenCalledWith(FORM_ID, ownerUser);
    });

    it('AC-8 — returns 404 for a different authenticated user', async () => {
      currentUser = otherUser;
      formService.getForm.mockRejectedValue(new NotFoundException(`Form "${FORM_ID}" not found`));

      const res = await request(app.getHttpServer()).get(`/forms/${FORM_ID}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /forms/:id ────────────────────────────────────────────────────────

  describe('PATCH /forms/:id', () => {
    it('AC-9 — returns 200 for the form owner', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer())
        .patch(`/forms/${FORM_ID}`)
        .send({ 'field-0': 'updated value' });

      expect(res.status).toBe(200);
      expect(formService.patchForm).toHaveBeenCalledWith(
        FORM_ID,
        expect.anything(),
        ownerUser,
      );
    });

    it('AC-9 — returns 404 for a different authenticated user', async () => {
      currentUser = otherUser;
      formService.patchForm.mockRejectedValue(new NotFoundException(`Form "${FORM_ID}" not found`));

      const res = await request(app.getHttpServer())
        .patch(`/forms/${FORM_ID}`)
        .send({ 'field-0': 'updated value' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /forms/:id ───────────────────────────────────────────────────────

  describe('DELETE /forms/:id', () => {
    it('AC-10 — returns 204 for the form owner', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer()).delete(`/forms/${FORM_ID}`);

      expect(res.status).toBe(204);
      expect(formService.deleteForm).toHaveBeenCalledWith(FORM_ID, ownerUser);
    });

    it('AC-10 — returns 404 for a different authenticated user', async () => {
      currentUser = otherUser;
      formService.deleteForm.mockRejectedValue(new NotFoundException(`Form "${FORM_ID}" not found`));

      const res = await request(app.getHttpServer()).delete(`/forms/${FORM_ID}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /forms/:id/submit ──────────────────────────────────────────────────

  describe('POST /forms/:id/submit', () => {
    it('AC-11 — returns 200 for the form owner', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer()).post(`/forms/${FORM_ID}/submit`);

      expect(res.status).toBe(200);
      expect(formService.submitForm).toHaveBeenCalledWith(FORM_ID, ownerUser);
    });

    it('AC-11 — returns 404 for a different authenticated user', async () => {
      currentUser = otherUser;
      formService.submitForm.mockRejectedValue(new NotFoundException(`Form "${FORM_ID}" not found`));

      const res = await request(app.getHttpServer()).post(`/forms/${FORM_ID}/submit`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /forms/:id/files ───────────────────────────────────────────────────

  describe('POST /forms/:id/files', () => {
    it('AC-12 — returns 201 for the form owner', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer())
        .post(`/forms/${FORM_ID}/files`)
        .attach('file', Buffer.from('test content'), 'test.txt')
        .query({ fieldId: 'field-0' });

      expect(res.status).toBe(201);
      expect(formService.createFileRecord).toHaveBeenCalledWith(
        FORM_ID,
        'field-0',
        expect.any(String),
        expect.objectContaining({ originalName: 'test.txt' }),
        ownerUser,
      );
    });

    it('AC-12 — returns 404 for a different authenticated user', async () => {
      currentUser = otherUser;
      formService.createFileRecord.mockRejectedValue(
        new NotFoundException(`Form "${FORM_ID}" not found`),
      );

      const res = await request(app.getHttpServer())
        .post(`/forms/${FORM_ID}/files`)
        .attach('file', Buffer.from('test content'), 'test.txt')
        .query({ fieldId: 'field-0' });

      expect(res.status).toBe(404);
    });
  });

  // ── GET /forms/:id/files/:fileId/download ───────────────────────────────────

  describe('GET /forms/:id/files/:fileId/download', () => {
    it('AC-13 — returns 200 for the form owner', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer()).get(
        `/forms/${FORM_ID}/files/${FILE_ID}/download`,
      );

      expect(res.status).toBe(200);
      expect(formService.getFileStream).toHaveBeenCalledWith(FORM_ID, FILE_ID, ownerUser);
    });

    it('AC-13 — returns 404 for a different authenticated user', async () => {
      currentUser = otherUser;
      formService.getFileStream.mockRejectedValue(new NotFoundException('File not found'));

      const res = await request(app.getHttpServer()).get(
        `/forms/${FORM_ID}/files/${FILE_ID}/download`,
      );

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /forms/:id/files/:fileId ────────────────────────────────────────

  describe('DELETE /forms/:id/files/:fileId', () => {
    it('AC-14 — returns 204 for the form owner', async () => {
      currentUser = ownerUser;

      const res = await request(app.getHttpServer()).delete(
        `/forms/${FORM_ID}/files/${FILE_ID}`,
      );

      expect(res.status).toBe(204);
      expect(formService.deleteFileRecord).toHaveBeenCalledWith(FORM_ID, FILE_ID, ownerUser);
    });

    it('AC-14 — returns 404 for a different authenticated user', async () => {
      currentUser = otherUser;
      formService.deleteFileRecord.mockRejectedValue(new NotFoundException('File not found'));

      const res = await request(app.getHttpServer()).delete(
        `/forms/${FORM_ID}/files/${FILE_ID}`,
      );

      expect(res.status).toBe(404);
    });
  });

  // ── AC-15: All form-specific endpoints return 401 when unauthenticated ──────

  describe('Unauthenticated requests', () => {
    beforeEach(() => {
      currentUser = null;
    });

    it('AC-15 — GET /forms/:id returns 401 when currentUser is null', async () => {
      const res = await request(app.getHttpServer()).get(`/forms/${FORM_ID}`);
      expect(res.status).toBe(401);
    });

    it('AC-15 — PATCH /forms/:id returns 401 when currentUser is null', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/forms/${FORM_ID}`)
        .send({});
      expect(res.status).toBe(401);
    });

    it('AC-15 — DELETE /forms/:id returns 401 when currentUser is null', async () => {
      const res = await request(app.getHttpServer()).delete(`/forms/${FORM_ID}`);
      expect(res.status).toBe(401);
    });

    it('AC-15 — POST /forms/:id/submit returns 401 when currentUser is null', async () => {
      const res = await request(app.getHttpServer()).post(`/forms/${FORM_ID}/submit`);
      expect(res.status).toBe(401);
    });

    it('AC-15 — POST /forms/:id/files returns 401 when currentUser is null', async () => {
      const res = await request(app.getHttpServer())
        .post(`/forms/${FORM_ID}/files`)
        .attach('file', Buffer.from('test content'), 'test.txt')
        .query({ fieldId: 'field-0' });
      expect(res.status).toBe(401);
    });

    it('AC-15 — GET /forms/:id/files/:fileId/download returns 401 when currentUser is null', async () => {
      const res = await request(app.getHttpServer()).get(
        `/forms/${FORM_ID}/files/${FILE_ID}/download`,
      );
      expect(res.status).toBe(401);
    });

    it('AC-15 — DELETE /forms/:id/files/:fileId returns 401 when currentUser is null', async () => {
      const res = await request(app.getHttpServer()).delete(
        `/forms/${FORM_ID}/files/${FILE_ID}`,
      );
      expect(res.status).toBe(401);
    });
  });
});

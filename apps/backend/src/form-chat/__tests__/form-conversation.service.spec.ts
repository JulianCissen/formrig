import { FormConversationService } from '../form-conversation.service';
import { FormConversation } from '../entities/form-conversation.entity';
import { Form } from '../../form/entities/form.entity';

describe('FormConversationService', () => {
  const FORM_ID = '11111111-1111-1111-1111-111111111111';
  const USER_ID = '22222222-2222-2222-2222-222222222222';

  function makeForm(values: Record<string, unknown> = {}): Form {
    return { id: FORM_ID, values } as Form;
  }

  function makeConversation(partial: Partial<FormConversation> = {}): FormConversation {
    return {
      id: '33333333-3333-3333-3333-333333333333',
      form: { id: FORM_ID } as Form,
      messages: [],
      skippedFieldIds: [],
      currentFieldId: null,
      status: 'COLLECTING',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    } as FormConversation;
  }

  function makeService(repoOverrides: Record<string, jest.Mock>, emOverrides: Record<string, jest.Mock>) {
    const repo = {
      findOne: jest.fn(),
      ...repoOverrides,
    };
    const flushMock = jest.fn().mockResolvedValue(undefined);
    const persistMock = jest.fn().mockReturnValue({ flush: flushMock });
    const em = {
      create: jest.fn(),
      persist: persistMock,
      flush: flushMock,
      ...emOverrides,
    };
    const svc = new FormConversationService(repo as any, em as any);
    return { svc, repo, em, flushMock };
  }

  describe('findOrCreate()', () => {
    it('returns existing conversation when one exists', async () => {
      const form = makeForm();
      const existing = makeConversation();
      const { svc, repo, em } = makeService(
        { findOne: jest.fn().mockResolvedValue(existing) },
        {},
      );

      const result = await svc.findOrCreate(form, USER_ID);

      expect(result).toBe(existing);
      expect(repo.findOne).toHaveBeenCalledWith({
        form: { id: FORM_ID, owner: { id: USER_ID } },
      });
      expect(em.persist).not.toHaveBeenCalled();
    });

    it('creates a new conversation when none exists', async () => {
      const form = makeForm();
      const newConv = makeConversation();
      const { svc, repo, em, flushMock } = makeService(
        { findOne: jest.fn().mockResolvedValue(null) },
        { create: jest.fn().mockReturnValue(newConv) },
      );

      const result = await svc.findOrCreate(form, USER_ID);

      expect(result).toBe(newConv);
      expect(em.create).toHaveBeenCalledWith(
        FormConversation,
        expect.objectContaining({
          form,
          messages: [],
          skippedFieldIds: [],
          currentFieldId: null,
          status: 'COLLECTING',
        }),
      );
      expect(em.persist).toHaveBeenCalledWith(newConv);
      expect(flushMock).toHaveBeenCalled();
    });

    it('queries with ownership scope including owner.id', async () => {
      const form = makeForm();
      const { svc, repo } = makeService(
        { findOne: jest.fn().mockResolvedValue(null) },
        { create: jest.fn().mockReturnValue(makeConversation()) },
      );

      await svc.findOrCreate(form, USER_ID);

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          form: expect.objectContaining({ owner: { id: USER_ID } }),
        }),
      );
    });

    it('creates new conversation with status COLLECTING', async () => {
      const form = makeForm();
      const newConv = makeConversation({ status: 'COLLECTING' });
      const { svc } = makeService(
        { findOne: jest.fn().mockResolvedValue(null) },
        { create: jest.fn().mockReturnValue(newConv) },
      );

      const result = await svc.findOrCreate(form, USER_ID);
      expect(result.status).toBe('COLLECTING');
    });

  });

  describe('save()', () => {
    it('calls persist().flush() with the conversation', async () => {
      const conv = makeConversation();
      const { svc, em, flushMock } = makeService({}, {});

      await svc.save(conv);

      expect(em.persist).toHaveBeenCalledWith(conv);
      expect(flushMock).toHaveBeenCalled();
    });
  });
});

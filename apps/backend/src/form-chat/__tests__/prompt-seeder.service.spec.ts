import { PromptSeederService } from '../prompt-seeder.service';
import { FormChatPrompt } from '../entities/form-chat-prompt.entity';
import { PROMPT_DEFAULTS } from '../utils/prompt-defaults';

const TOTAL_KEYS = Object.keys(PROMPT_DEFAULTS).length;

describe('PromptSeederService', () => {
  function makeService(existingKeys: string[] = []) {
    const createdPrompts: Array<{ key: string; template: string }> = [];

    const forkedEm = {
      nativeDelete: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockImplementation((_Entity: unknown, { key }: { key: string }) => {
        return Promise.resolve(existingKeys.includes(key) ? { key } : null);
      }),
      create: jest.fn().mockImplementation((_Entity: unknown, data: { key: string; template: string }) => {
        createdPrompts.push(data);
        return data;
      }),
      flush: jest.fn().mockResolvedValue(undefined),
    };

    const em = {
      fork: jest.fn().mockReturnValue(forkedEm),
    };

    const svc = new PromptSeederService(em as any);
    return { svc, em: forkedEm, forkedEm, mainEm: em, createdPrompts };
  }

  describe('dev/test path — delete-then-refresh behaviour', () => {
    const savedEnv = process.env.NODE_ENV;
    beforeEach(() => { process.env.NODE_ENV = 'test'; });
    afterEach(() => { process.env.NODE_ENV = savedEnv; });

    it('dev refresh — nativeDelete is called to wipe all existing rows', async () => {
      const { svc, forkedEm } = makeService();

      await svc.onModuleInit();

      expect(forkedEm.nativeDelete).toHaveBeenCalledTimes(1);
      expect(forkedEm.nativeDelete).toHaveBeenCalledWith(FormChatPrompt, {});
    });

    it('dev refresh — em.create is called for every PROMPT_DEFAULTS key after delete', async () => {
      const { svc, createdPrompts } = makeService(['nlg.first_ask']); // existingKeys ignored in dev path

      await svc.onModuleInit();

      expect(createdPrompts).toHaveLength(TOTAL_KEYS);
      const createdKeys = createdPrompts.map((p) => p.key);
      for (const key of Object.keys(PROMPT_DEFAULTS)) {
        expect(createdKeys).toContain(key);
      }
    });

    it('dev refresh — uses correct template from PROMPT_DEFAULTS for all created prompts', async () => {
      const { svc, createdPrompts } = makeService();

      await svc.onModuleInit();

      for (const prompt of createdPrompts) {
        expect(prompt.template).toBe(PROMPT_DEFAULTS[prompt.key]);
      }
    });

    it('dev refresh — em.flush is called exactly once', async () => {
      const { svc, forkedEm } = makeService();

      await svc.onModuleInit();

      expect(forkedEm.flush).toHaveBeenCalledTimes(1);
    });

    it('dev refresh — findOne is never called (no per-key check needed after full delete)', async () => {
      const { svc, forkedEm } = makeService();

      await svc.onModuleInit();

      expect(forkedEm.findOne).not.toHaveBeenCalled();
    });
  });

  describe('production path — upsert/existing-key preservation behaviour', () => {
    const savedEnv = process.env.NODE_ENV;
    beforeEach(() => { process.env.NODE_ENV = 'production'; });
    afterEach(() => { process.env.NODE_ENV = savedEnv; });

    it('production upsert — nativeDelete is NOT called so existing customised rows are preserved', async () => {
      const { svc, forkedEm } = makeService();

      await svc.onModuleInit();

      expect(forkedEm.nativeDelete).not.toHaveBeenCalled();
    });

    it('production upsert — inserts all keys when database is empty', async () => {
      const { svc, createdPrompts } = makeService([]); // no existing keys

      await svc.onModuleInit();

      expect(createdPrompts).toHaveLength(TOTAL_KEYS);
    });

    it('production existing — only missing keys are created when some already exist', async () => {
      const existingKeys = ['nlg.first_ask', 'nlu.value_extraction'];
      const { svc, createdPrompts } = makeService(existingKeys);

      await svc.onModuleInit();

      expect(createdPrompts).toHaveLength(TOTAL_KEYS - existingKeys.length);
      const insertedKeys = createdPrompts.map((p) => p.key);
      for (const key of existingKeys) {
        expect(insertedKeys).not.toContain(key);
      }
    });

    it('production existing — em.create not called when all keys already exist', async () => {
      const { svc, forkedEm } = makeService(Object.keys(PROMPT_DEFAULTS));

      await svc.onModuleInit();

      expect(forkedEm.create).not.toHaveBeenCalled();
    });

    it('production upsert — em.flush called exactly once regardless of inserts', async () => {
      const { svc, forkedEm } = makeService([]);

      await svc.onModuleInit();

      expect(forkedEm.flush).toHaveBeenCalledTimes(1);
    });

    it('production existing — uses correct template from PROMPT_DEFAULTS for created prompts', async () => {
      const { svc, createdPrompts } = makeService([]);

      await svc.onModuleInit();

      for (const prompt of createdPrompts) {
        expect(prompt.template).toBe(PROMPT_DEFAULTS[prompt.key]);
      }
    });
  });
});

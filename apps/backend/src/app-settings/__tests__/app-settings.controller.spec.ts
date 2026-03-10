import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppSettingsController } from '../app-settings.controller';
import { AppSettingsService } from '../app-settings.service';
import { AppSettingsModule } from '../app-settings.module';

async function buildModule(env: Record<string, string>): Promise<AppSettingsController> {
  // Set env vars before module initialisation
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  const module: TestingModule = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
    controllers: [AppSettingsController],
    providers: [AppSettingsService],
  }).compile();

  return module.get<AppSettingsController>(AppSettingsController);
}

function clearEnv(): void {
  delete process.env['AI_FEATURE_ENABLED'];
  delete process.env['DEFAULT_INTERFACE'];
}

describe('AppSettingsController', () => {
  afterEach(clearEnv);

  describe('AC-1: response shape', () => {
    it('returns an object with aiEnabled (boolean) and defaultInterface ("form"|"chat")', async () => {
      const controller = await buildModule({});
      const result = controller.getSettings();
      expect(typeof result.aiEnabled).toBe('boolean');
      expect(['form', 'chat']).toContain(result.defaultInterface);
    });
  });

  describe('AC-2 (HTTP-level): GET /app-settings requires no auth', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          AppSettingsModule,
        ],
      }).compile();
      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => { await app.close(); });

    it('returns 200 without an Authorization header', () => {
      return request(app.getHttpServer())
        .get('/app-settings')
        .expect(200)
        .expect((res: request.Response) => {
          expect(typeof res.body.aiEnabled).toBe('boolean');
          expect(['form', 'chat']).toContain(res.body.defaultInterface);
        });
    });
  });

  describe('AC-3: AI_FEATURE_ENABLED logic', () => {
    it('defaults aiEnabled to true when env var is absent', async () => {
      const controller = await buildModule({});
      expect(controller.getSettings().aiEnabled).toBe(true);
    });

    it('returns aiEnabled: false when AI_FEATURE_ENABLED=false', async () => {
      const controller = await buildModule({ AI_FEATURE_ENABLED: 'false' });
      expect(controller.getSettings().aiEnabled).toBe(false);
    });

    it('returns aiEnabled: false when AI_FEATURE_ENABLED=0', async () => {
      const controller = await buildModule({ AI_FEATURE_ENABLED: '0' });
      expect(controller.getSettings().aiEnabled).toBe(false);
    });

    it('returns aiEnabled: false when AI_FEATURE_ENABLED=FALSE (uppercase)', async () => {
      const controller = await buildModule({ AI_FEATURE_ENABLED: 'FALSE' });
      expect(controller.getSettings().aiEnabled).toBe(false);
    });

    it('returns aiEnabled: true for any other value', async () => {
      const controller = await buildModule({ AI_FEATURE_ENABLED: 'yes' });
      expect(controller.getSettings().aiEnabled).toBe(true);
    });
  });

  describe('AC-4: DEFAULT_INTERFACE logic', () => {
    it('defaults defaultInterface to "form" when env var is absent', async () => {
      const controller = await buildModule({});
      expect(controller.getSettings().defaultInterface).toBe('form');
    });

    it('defaults defaultInterface to "form" when env var is invalid', async () => {
      const controller = await buildModule({ DEFAULT_INTERFACE: 'invalid' });
      expect(controller.getSettings().defaultInterface).toBe('form');
    });

    it('returns defaultInterface: "form" when set to "form"', async () => {
      const controller = await buildModule({ DEFAULT_INTERFACE: 'form' });
      expect(controller.getSettings().defaultInterface).toBe('form');
    });
  });

  describe('AC-5: both vars set to truthy/chat values', () => {
    it('returns { aiEnabled: true, defaultInterface: "chat" } when both set', async () => {
      const controller = await buildModule({
        AI_FEATURE_ENABLED: 'true',
        DEFAULT_INTERFACE: 'chat',
      });
      const result = controller.getSettings();
      expect(result).toEqual({ aiEnabled: true, defaultInterface: 'chat' });
    });
  });
});

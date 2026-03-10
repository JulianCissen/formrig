import { z } from 'zod';

export const AppSettingsSchema = z.object({
  aiEnabled: z.boolean(),
  defaultInterface: z.enum(['form', 'chat']),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

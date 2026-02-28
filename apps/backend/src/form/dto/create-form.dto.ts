import { z } from 'zod';

export const CreateFormSchema = z.object({
  pluginId: z.string().min(1),
}).strict();

export type CreateFormDto = z.infer<typeof CreateFormSchema>;

import { z } from 'zod';

export const ChatTurnRequestSchema = z.object({
  message: z.string().max(10000).optional(),
  attachmentFileIds: z.array(z.string().uuid()).optional(),
}).strict().superRefine((data, ctx) => {
  const hasMessage = typeof data.message === 'string' && data.message.length > 0;
  const hasAttachments = Array.isArray(data.attachmentFileIds) && data.attachmentFileIds.length > 0;
  if (!hasMessage && !hasAttachments) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'message must not be empty when no attachments are provided',
      path: ['message'],
    });
  }
});

export type ChatTurnRequestDto = z.infer<typeof ChatTurnRequestSchema>;

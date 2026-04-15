import { z } from 'zod/v4';
import { notImplementedErrorCode } from '../errors/codes.js';

export const notImplementedResponseSchema = z.object({
  code: z.literal(notImplementedErrorCode),
  message: z.string().min(1),
});

export function buildNotImplementedResponse(message: string) {
  return notImplementedResponseSchema.parse({
    code: notImplementedErrorCode,
    message,
  });
}

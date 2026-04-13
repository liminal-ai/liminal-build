import { z } from 'zod/v4';
import { story0NotImplementedErrorCode } from '../errors/codes.js';

export const notImplementedResponseSchema = z.object({
  code: z.literal(story0NotImplementedErrorCode),
  message: z.string().min(1),
});

export function buildNotImplementedResponse(message: string) {
  return notImplementedResponseSchema.parse({
    code: story0NotImplementedErrorCode,
    message,
  });
}

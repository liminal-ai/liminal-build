import { z } from 'zod/v4';
import {
  currentProcessRequestSchema,
  environmentSummarySchema,
  processHistoryItemSchema,
  processMaterialsSectionEnvelopeSchema,
  processSurfaceSectionErrorSchema,
  processSurfaceSummarySchema,
  sideWorkSectionEnvelopeSchema,
} from './process-work-surface.js';

export const liveProcessMessageTypeSchema = z.enum(['snapshot', 'upsert', 'complete', 'error']);
export type LiveProcessMessageType = z.infer<typeof liveProcessMessageTypeSchema>;

export const liveProcessEntityTypeSchema = z.enum([
  'process',
  'history',
  'current_request',
  'materials',
  'side_work',
  'environment',
]);
export type LiveProcessEntityType = z.infer<typeof liveProcessEntityTypeSchema>;

export const liveProcessDataMessageTypeSchema = z.enum(['snapshot', 'upsert', 'complete']);
export type LiveProcessDataMessageType = z.infer<typeof liveProcessDataMessageTypeSchema>;

export const liveProcessMessageBaseSchema = z.object({
  subscriptionId: z.string().min(1),
  processId: z.string().min(1),
  sequenceNumber: z.number().int().nonnegative(),
  entityId: z.string().min(1),
  correlationId: z.string().min(1).nullable(),
  completedAt: z.string().min(1).nullable(),
});
export type LiveProcessMessageBase = z.infer<typeof liveProcessMessageBaseSchema>;

const processLiveDataMessageSchema = liveProcessMessageBaseSchema
  .extend({
    messageType: liveProcessDataMessageTypeSchema,
    entityType: z.literal('process'),
    payload: processSurfaceSummarySchema,
  })
  .superRefine((value, context) => {
    if (value.entityId !== value.processId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process live messages must use the process id as the entity id.',
        path: ['entityId'],
      });
    }

    if (value.payload.processId !== value.processId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process live messages must match the top-level processId and payload.processId.',
        path: ['payload', 'processId'],
      });
    }
  });

const historyLiveDataMessageSchema = liveProcessMessageBaseSchema.extend({
  messageType: liveProcessDataMessageTypeSchema,
  entityType: z.literal('history'),
  payload: processHistoryItemSchema,
});

const currentRequestLiveDataMessageSchema = liveProcessMessageBaseSchema.extend({
  messageType: liveProcessDataMessageTypeSchema,
  entityType: z.literal('current_request'),
  entityId: z.literal('current_request'),
  payload: currentProcessRequestSchema.nullable(),
});

const materialsLiveDataMessageSchema = liveProcessMessageBaseSchema.extend({
  messageType: liveProcessDataMessageTypeSchema,
  entityType: z.literal('materials'),
  payload: processMaterialsSectionEnvelopeSchema,
});

const sideWorkLiveDataMessageSchema = liveProcessMessageBaseSchema.extend({
  messageType: liveProcessDataMessageTypeSchema,
  entityType: z.literal('side_work'),
  payload: sideWorkSectionEnvelopeSchema,
});

const environmentLiveDataMessageSchema = liveProcessMessageBaseSchema.extend({
  messageType: liveProcessDataMessageTypeSchema,
  entityType: z.literal('environment'),
  entityId: z.literal('environment'),
  payload: environmentSummarySchema,
});

const liveProcessErrorMessageSchema = liveProcessMessageBaseSchema.extend({
  messageType: z.literal('error'),
  entityType: z.enum(['history', 'materials', 'side_work']),
  payload: processSurfaceSectionErrorSchema,
});

export const liveProcessUpdateMessageSchema = z.union([
  processLiveDataMessageSchema,
  historyLiveDataMessageSchema,
  currentRequestLiveDataMessageSchema,
  materialsLiveDataMessageSchema,
  sideWorkLiveDataMessageSchema,
  environmentLiveDataMessageSchema,
  liveProcessErrorMessageSchema,
]);
export type LiveProcessUpdateMessage = z.infer<typeof liveProcessUpdateMessageSchema>;

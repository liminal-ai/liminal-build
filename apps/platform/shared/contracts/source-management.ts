import { z } from 'zod/v4';
import {
  attachmentScopeSchema,
  hydrationStateSchema,
  sourceAccessModeSchema,
  sourceAttachmentSummarySchema,
  sourceAttachmentVisibilitySchema,
  sourceProviderSchema,
  sourceProvenanceEntryStatusSchema,
  sourceProvenanceRelationshipSchema,
  sourcePurposeSchema,
  sourceRefreshStatusSchema,
} from './schemas.js';

export const projectSourceAttachmentsApiPathnamePattern =
  '/api/projects/:projectId/source-attachments' as const;
export const processSourceAttachmentsApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/source-attachments' as const;
export const sourceAttachmentApiPathnamePattern =
  '/api/projects/:projectId/source-attachments/:sourceAttachmentId' as const;
export const sourceAttachmentRefreshApiPathnamePattern =
  '/api/projects/:projectId/source-attachments/:sourceAttachmentId/refresh' as const;
export const processSourceProvenanceApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/source-provenance' as const;

export const projectSourceAttachmentsRouteParamsSchema = z.object({
  projectId: z.string().min(1),
});
export type ProjectSourceAttachmentsRouteParams = z.infer<
  typeof projectSourceAttachmentsRouteParamsSchema
>;

export const processSourceAttachmentsRouteParamsSchema = z.object({
  projectId: z.string().min(1),
  processId: z.string().min(1),
});
export type ProcessSourceAttachmentsRouteParams = z.infer<
  typeof processSourceAttachmentsRouteParamsSchema
>;

export const sourceAttachmentRouteParamsSchema = z.object({
  projectId: z.string().min(1),
  sourceAttachmentId: z.string().min(1),
});
export type SourceAttachmentRouteParams = z.infer<typeof sourceAttachmentRouteParamsSchema>;

export const createSourceAttachmentRequestSchema = z.object({
  provider: sourceProviderSchema,
  repositoryUrl: z.string().min(1),
  repositoryFullName: z.string().min(1).optional(),
  displayName: z.string().min(1),
  purpose: sourcePurposeSchema,
  accessMode: sourceAccessModeSchema,
  targetRef: z.string().min(1).nullable().optional(),
});
export type CreateSourceAttachmentRequest = z.infer<typeof createSourceAttachmentRequestSchema>;

export const updateSourceAttachmentRequestSchema = z
  .object({
    purpose: sourcePurposeSchema.optional(),
    accessMode: sourceAccessModeSchema.optional(),
    targetRef: z.string().min(1).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Update source attachment requests must include at least one mutable field.',
  });
export type UpdateSourceAttachmentRequest = z.infer<typeof updateSourceAttachmentRequestSchema>;

export const refreshSourceAttachmentResponseSchema = z.object({
  sourceAttachment: sourceAttachmentSummarySchema.optional(),
  refreshStatus: sourceRefreshStatusSchema,
  refreshRequestedAt: z.string().min(1).optional(),
});
export type RefreshSourceAttachmentResponse = z.infer<typeof refreshSourceAttachmentResponseSchema>;

export const detachSourceAttachmentResponseSchema = z.object({
  detached: z.literal(true),
  sourceAttachmentId: z.string().min(1),
  detachedAt: z.string().min(1),
});
export type DetachSourceAttachmentResponse = z.infer<typeof detachSourceAttachmentResponseSchema>;

export const sourceManagementErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'PROJECT_FORBIDDEN',
  'PROCESS_FORBIDDEN',
  'PROJECT_NOT_FOUND',
  'PROCESS_NOT_FOUND',
  'SOURCE_ATTACHMENT_NOT_FOUND',
  'SOURCE_ATTACHMENT_CONFLICT',
  'SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE',
  'INVALID_SOURCE_ATTACHMENT',
  'SOURCE_ATTACHMENT_UNAVAILABLE',
]);
export type SourceManagementErrorCode = z.infer<typeof sourceManagementErrorCodeSchema>;

export const sourceProvenanceEntrySchema = z.object({
  provenanceId: z.string().min(1),
  sourceAttachmentId: z.string().min(1).nullable(),
  relationshipKind: sourceProvenanceRelationshipSchema,
  repositoryFullName: z.string().min(1),
  repositoryUrl: z.string().min(1),
  targetRef: z.string().min(1).nullable(),
  currentAttachmentDisplayName: z.string().min(1).nullable(),
  currentAttachmentScope: attachmentScopeSchema.nullable(),
  currentAttachmentAccessMode: sourceAccessModeSchema.nullable(),
  currentAttachmentHydrationState: hydrationStateSchema.nullable(),
  currentAttachmentVisibility: sourceAttachmentVisibilitySchema,
  entryStatus: sourceProvenanceEntryStatusSchema,
  degradationReason: z.string().min(1).nullable(),
  recordedAt: z.string().min(1),
});
export type SourceProvenanceEntry = z.infer<typeof sourceProvenanceEntrySchema>;

export const listProcessSourceProvenanceResponseSchema = z.object({
  entries: z.array(sourceProvenanceEntrySchema),
});
export type ListProcessSourceProvenanceResponse = z.infer<
  typeof listProcessSourceProvenanceResponseSchema
>;

export const processSourceProvenanceSectionStatusSchema = z.enum(['ready', 'empty', 'error']);
export type ProcessSourceProvenanceSectionStatus = z.infer<
  typeof processSourceProvenanceSectionStatusSchema
>;

export const processSourceProvenanceSectionErrorCodeSchema = z.enum([
  'PROCESS_SOURCE_PROVENANCE_UNAVAILABLE',
]);
export type ProcessSourceProvenanceSectionErrorCode = z.infer<
  typeof processSourceProvenanceSectionErrorCodeSchema
>;

export const processSourceProvenanceSectionErrorSchema = z.object({
  code: processSourceProvenanceSectionErrorCodeSchema,
  message: z.string().min(1),
});
export type ProcessSourceProvenanceSectionError = z.infer<
  typeof processSourceProvenanceSectionErrorSchema
>;

export const processSourceProvenanceSectionStateSchema = z
  .object({
    status: processSourceProvenanceSectionStatusSchema,
    entries: z.array(sourceProvenanceEntrySchema),
    error: processSourceProvenanceSectionErrorSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'error' && value.error === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source provenance error state requires an error payload.',
      });
    }
  });
export type ProcessSourceProvenanceSectionState = z.infer<
  typeof processSourceProvenanceSectionStateSchema
>;

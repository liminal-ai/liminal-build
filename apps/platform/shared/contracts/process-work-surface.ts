import { z } from 'zod/v4';
import {
  hydrationStateSchema,
  processStatusSchema,
  projectRoleSchema,
  sectionStatusSchema,
  sourcePurposeSchema,
  supportedProcessTypeSchema,
} from './schemas.js';

export const processWorkSurfaceRouteTemplate = '/projects/{projectId}/processes/{processId}' as const;
export const processWorkSurfaceRoutePathnamePattern =
  '/projects/:projectId/processes/:processId' as const;
export const processWorkSurfaceApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId' as const;
export const processStartApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/start' as const;
export const processResumeApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/resume' as const;
export const processResponseApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/responses' as const;
export const processLiveUpdatesPathnamePattern =
  '/ws/projects/:projectId/processes/:processId' as const;

export const processWorkSurfaceRouteParamsSchema = z.object({
  projectId: z.string().min(1),
  processId: z.string().min(1),
});
export type ProcessWorkSurfaceRouteParams = z.infer<typeof processWorkSurfaceRouteParamsSchema>;

export function buildProcessWorkSurfacePath(args: ProcessWorkSurfaceRouteParams): string {
  return `/projects/${args.projectId}/processes/${args.processId}`;
}

export function buildProcessWorkSurfaceApiPath(args: ProcessWorkSurfaceRouteParams): string {
  return `/api${buildProcessWorkSurfacePath(args)}`;
}

export function buildProcessStartApiPath(args: ProcessWorkSurfaceRouteParams): string {
  return `${buildProcessWorkSurfaceApiPath(args)}/start`;
}

export function buildProcessResumeApiPath(args: ProcessWorkSurfaceRouteParams): string {
  return `${buildProcessWorkSurfaceApiPath(args)}/resume`;
}

export function buildProcessResponseApiPath(args: ProcessWorkSurfaceRouteParams): string {
  return `${buildProcessWorkSurfaceApiPath(args)}/responses`;
}

export function buildProcessLiveUpdatesPath(args: ProcessWorkSurfaceRouteParams): string {
  return `/ws${buildProcessWorkSurfacePath(args)}`;
}

export const processSurfaceAvailableActionSchema = z.enum([
  'start',
  'respond',
  'resume',
  'review',
  'restart',
]);
export type ProcessSurfaceAvailableAction = z.infer<typeof processSurfaceAvailableActionSchema>;

export const processHistoryItemKindSchema = z.enum([
  'user_message',
  'process_message',
  'progress_update',
  'attention_request',
  'side_work_update',
  'process_event',
]);
export type ProcessHistoryItemKind = z.infer<typeof processHistoryItemKindSchema>;

export const processHistoryItemLifecycleSchema = z.enum(['current', 'finalized']);
export type ProcessHistoryItemLifecycle = z.infer<typeof processHistoryItemLifecycleSchema>;

export const currentProcessRequestKindSchema = z.enum([
  'clarification',
  'decision',
  'approval',
  'course_correction',
  'other',
]);
export type CurrentProcessRequestKind = z.infer<typeof currentProcessRequestKindSchema>;

export const processSurfaceSectionErrorCodeSchema = z.enum([
  'PROCESS_SURFACE_HISTORY_LOAD_FAILED',
  'PROCESS_SURFACE_MATERIALS_LOAD_FAILED',
  'PROCESS_SURFACE_SIDE_WORK_LOAD_FAILED',
]);
export type ProcessSurfaceSectionErrorCode = z.infer<typeof processSurfaceSectionErrorCodeSchema>;

export const processLiveStatusCodeSchema = z.enum(['PROCESS_LIVE_UPDATES_UNAVAILABLE']);
export type ProcessLiveStatusCode = z.infer<typeof processLiveStatusCodeSchema>;

export const processSurfaceProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  role: projectRoleSchema,
});
export type ProcessSurfaceProject = z.infer<typeof processSurfaceProjectSchema>;

export const processSurfaceSummarySchema = z.object({
  processId: z.string().min(1),
  displayLabel: z.string().min(1),
  processType: supportedProcessTypeSchema,
  status: processStatusSchema,
  phaseLabel: z.string().min(1),
  nextActionLabel: z.string().min(1).nullable(),
  availableActions: z.array(processSurfaceAvailableActionSchema),
  updatedAt: z.string().min(1),
});
export type ProcessSurfaceSummary = z.infer<typeof processSurfaceSummarySchema>;

export const processSurfaceSectionErrorSchema = z.object({
  code: processSurfaceSectionErrorCodeSchema,
  message: z.string().min(1),
});
export type ProcessSurfaceSectionError = z.infer<typeof processSurfaceSectionErrorSchema>;

export const processHistoryItemSchema = z.object({
  historyItemId: z.string().min(1),
  kind: processHistoryItemKindSchema,
  lifecycleState: processHistoryItemLifecycleSchema,
  text: z.string().min(1),
  createdAt: z.string().min(1),
  relatedSideWorkId: z.string().min(1).nullable(),
  relatedArtifactId: z.string().min(1).nullable(),
});
export type ProcessHistoryItem = z.infer<typeof processHistoryItemSchema>;

export const processHistorySectionEnvelopeSchema = z
  .object({
    status: sectionStatusSchema,
    items: z.array(processHistoryItemSchema),
    error: processSurfaceSectionErrorSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'error' && value.error === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process history error state requires an error payload.',
      });
    }
  });
export type ProcessHistorySectionEnvelope = z.infer<typeof processHistorySectionEnvelopeSchema>;

export const currentProcessRequestSchema = z.object({
  requestId: z.string().min(1),
  requestKind: currentProcessRequestKindSchema,
  promptText: z.string().min(1),
  requiredActionLabel: z.string().min(1).nullable(),
  createdAt: z.string().min(1),
});
export type CurrentProcessRequest = z.infer<typeof currentProcessRequestSchema>;

export const processArtifactReferenceSchema = z.object({
  artifactId: z.string().min(1),
  displayName: z.string().min(1),
  currentVersionLabel: z.string().min(1).nullable(),
  roleLabel: z.string().min(1).nullable(),
  updatedAt: z.string().min(1),
});
export type ProcessArtifactReference = z.infer<typeof processArtifactReferenceSchema>;

export const processOutputReferenceSchema = z.object({
  outputId: z.string().min(1),
  displayName: z.string().min(1),
  revisionLabel: z.string().min(1).nullable(),
  state: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type ProcessOutputReference = z.infer<typeof processOutputReferenceSchema>;

export const processSourceReferenceSchema = z.object({
  sourceAttachmentId: z.string().min(1),
  displayName: z.string().min(1),
  purpose: sourcePurposeSchema,
  targetRef: z.string().min(1).nullable(),
  hydrationState: hydrationStateSchema,
  updatedAt: z.string().min(1),
});
export type ProcessSourceReference = z.infer<typeof processSourceReferenceSchema>;

export const processMaterialsSectionEnvelopeSchema = z
  .object({
    status: sectionStatusSchema,
    currentArtifacts: z.array(processArtifactReferenceSchema),
    currentOutputs: z.array(processOutputReferenceSchema),
    currentSources: z.array(processSourceReferenceSchema),
    error: processSurfaceSectionErrorSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'error' && value.error === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process materials error state requires an error payload.',
      });
    }
  });
export type ProcessMaterialsSectionEnvelope = z.infer<typeof processMaterialsSectionEnvelopeSchema>;

export const sideWorkStatusSchema = z.enum(['running', 'completed', 'failed']);
export type SideWorkStatus = z.infer<typeof sideWorkStatusSchema>;

export const sideWorkItemSchema = z.object({
  sideWorkId: z.string().min(1),
  displayLabel: z.string().min(1),
  purposeSummary: z.string().min(1),
  status: sideWorkStatusSchema,
  resultSummary: z.string().min(1).nullable(),
  updatedAt: z.string().min(1),
});
export type SideWorkItem = z.infer<typeof sideWorkItemSchema>;

export const sideWorkSectionEnvelopeSchema = z
  .object({
    status: sectionStatusSchema,
    items: z.array(sideWorkItemSchema),
    error: processSurfaceSectionErrorSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'error' && value.error === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Side-work error state requires an error payload.',
      });
    }
  });
export type SideWorkSectionEnvelope = z.infer<typeof sideWorkSectionEnvelopeSchema>;

export const processWorkSurfaceResponseSchema = z.object({
  project: processSurfaceProjectSchema,
  process: processSurfaceSummarySchema,
  history: processHistorySectionEnvelopeSchema,
  materials: processMaterialsSectionEnvelopeSchema,
  currentRequest: currentProcessRequestSchema.nullable(),
  sideWork: sideWorkSectionEnvelopeSchema,
});
export type ProcessWorkSurfaceResponse = z.infer<typeof processWorkSurfaceResponseSchema>;

export const startProcessResponseSchema = z.object({
  process: processSurfaceSummarySchema,
  currentRequest: currentProcessRequestSchema.nullable(),
});
export type StartProcessResponse = z.infer<typeof startProcessResponseSchema>;

export const resumeProcessResponseSchema = z.object({
  process: processSurfaceSummarySchema,
  currentRequest: currentProcessRequestSchema.nullable(),
});
export type ResumeProcessResponse = z.infer<typeof resumeProcessResponseSchema>;

export const submitProcessResponseRequestSchema = z.object({
  clientRequestId: z.string().trim().min(1),
  message: z.string().trim().min(1),
});
export type SubmitProcessResponseRequest = z.infer<typeof submitProcessResponseRequestSchema>;

export const submitProcessResponseResponseSchema = z.object({
  accepted: z.literal(true),
  historyItemId: z.string().min(1),
  process: processSurfaceSummarySchema,
  currentRequest: currentProcessRequestSchema.nullable(),
});
export type SubmitProcessResponseResponse = z.infer<typeof submitProcessResponseResponseSchema>;

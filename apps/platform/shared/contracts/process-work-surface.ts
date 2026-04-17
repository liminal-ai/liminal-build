import { z } from 'zod/v4';
import {
  hydrationStateSchema,
  processStatusSchema,
  projectRoleSchema,
  sectionStatusSchema,
  sourceAccessModeSchema,
  sourcePurposeSchema,
  supportedProcessTypeSchema,
} from './schemas.js';

export const processWorkSurfaceRouteTemplate =
  '/projects/{projectId}/processes/{processId}' as const;
export const processWorkSurfaceRoutePathnamePattern =
  '/projects/:projectId/processes/:processId' as const;
export const processWorkSurfaceApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId' as const;
export const processStartApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/start' as const;
export const processResumeApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/resume' as const;
export const processRehydrateApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/rehydrate' as const;
export const processRebuildApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/rebuild' as const;
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

export function buildProcessRehydrateApiPath(args: ProcessWorkSurfaceRouteParams): string {
  return `${buildProcessWorkSurfaceApiPath(args)}/rehydrate`;
}

export function buildProcessRebuildApiPath(args: ProcessWorkSurfaceRouteParams): string {
  return `${buildProcessWorkSurfaceApiPath(args)}/rebuild`;
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
  'rehydrate',
  'rebuild',
  'review',
  'restart',
]);
export type ProcessSurfaceAvailableAction = z.infer<typeof processSurfaceAvailableActionSchema>;

export const processSurfaceControlActionIdSchema = processSurfaceAvailableActionSchema;
export type ProcessSurfaceControlActionId = z.infer<typeof processSurfaceControlActionIdSchema>;

export const environmentStateSchema = z.enum([
  'absent',
  'preparing',
  'rehydrating',
  'ready',
  'running',
  'checkpointing',
  'stale',
  'failed',
  'lost',
  'rebuilding',
  'unavailable',
]);
export type EnvironmentState = z.infer<typeof environmentStateSchema>;

export const defaultEnvironmentStatusLabels = {
  absent: 'Not prepared',
  preparing: 'Preparing environment',
  rehydrating: 'Rehydrating environment',
  ready: 'Ready for work',
  running: 'Running in environment',
  checkpointing: 'Checkpointing work',
  stale: 'Environment is stale',
  failed: 'Environment failed',
  lost: 'Environment lost',
  rebuilding: 'Rebuilding environment',
  unavailable: 'Environment unavailable',
} as const satisfies Record<EnvironmentState, string>;

export function deriveEnvironmentStatusLabel(state: EnvironmentState): string {
  return defaultEnvironmentStatusLabels[state];
}

export const checkpointKindSchema = z.enum(['artifact', 'code', 'mixed']);
export type CheckpointKind = z.infer<typeof checkpointKindSchema>;

export const checkpointOutcomeSchema = z.enum(['succeeded', 'failed']);
export type CheckpointOutcome = z.infer<typeof checkpointOutcomeSchema>;

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

export const processSurfaceControlStateSchema = z.object({
  actionId: processSurfaceControlActionIdSchema,
  enabled: z.boolean(),
  disabledReason: z.string().min(1).nullable().default(null),
  label: z.string().min(1),
});
export type ProcessSurfaceControlState = z.infer<typeof processSurfaceControlStateSchema>;

export const processSurfaceControlOrder = [
  'start',
  'respond',
  'resume',
  'rehydrate',
  'rebuild',
  'review',
  'restart',
] as const satisfies readonly ProcessSurfaceControlActionId[];

export const defaultProcessSurfaceControlLabels = {
  start: 'Start process',
  respond: 'Respond',
  resume: 'Resume process',
  rehydrate: 'Rehydrate environment',
  rebuild: 'Rebuild environment',
  review: 'Review',
  restart: 'Restart process',
} as const satisfies Record<ProcessSurfaceControlActionId, string>;

export function buildProcessSurfaceControls(args: {
  availableActions: readonly ProcessSurfaceAvailableAction[];
  disabledReasons?: Partial<Record<ProcessSurfaceControlActionId, string>>;
  labels?: Partial<Record<ProcessSurfaceControlActionId, string>>;
}): ProcessSurfaceControlState[] {
  const availableActions = new Set(args.availableActions);

  return processSurfaceControlOrder.map((actionId) => {
    const disabledReason = args.disabledReasons?.[actionId] ?? null;

    return processSurfaceControlStateSchema.parse({
      actionId,
      enabled: availableActions.has(actionId) && disabledReason === null,
      disabledReason,
      label: args.labels?.[actionId] ?? defaultProcessSurfaceControlLabels[actionId],
    });
  });
}

export const defaultProcessSurfaceControls = buildProcessSurfaceControls({
  availableActions: [],
});

export const lastCheckpointResultSchema = z.object({
  checkpointId: z.string().min(1),
  checkpointKind: checkpointKindSchema,
  outcome: checkpointOutcomeSchema,
  targetLabel: z.string().min(1),
  targetRef: z.string().min(1).nullable().default(null),
  completedAt: z.string().min(1),
  failureReason: z.string().min(1).nullable().default(null),
});
export type LastCheckpointResult = z.infer<typeof lastCheckpointResultSchema>;

export const defaultEnvironmentSummary = {
  environmentId: null,
  state: 'absent',
  statusLabel: deriveEnvironmentStatusLabel('absent'),
  blockedReason: null,
  lastHydratedAt: null,
  lastCheckpointAt: null,
  lastCheckpointResult: null,
} as const;

export const environmentSummarySchema = z.object({
  environmentId: z.string().min(1).nullable(),
  state: environmentStateSchema,
  statusLabel: z.string().min(1),
  blockedReason: z.string().min(1).nullable(),
  lastHydratedAt: z.string().min(1).nullable(),
  lastCheckpointAt: z.string().min(1).nullable(),
  lastCheckpointResult: lastCheckpointResultSchema.nullable(),
});
export type EnvironmentSummary = z.infer<typeof environmentSummarySchema>;

export const processSurfaceSummarySchema = z.object({
  processId: z.string().min(1),
  displayLabel: z.string().min(1),
  processType: supportedProcessTypeSchema,
  status: processStatusSchema,
  phaseLabel: z.string().min(1),
  nextActionLabel: z.string().min(1).nullable(),
  availableActions: z.array(processSurfaceAvailableActionSchema),
  controls: z.array(processSurfaceControlStateSchema),
  hasEnvironment: z.boolean(),
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
  accessMode: sourceAccessModeSchema,
  // Canonical clone URL for the source. Mirrored from the durable
  // `sourceAttachments` row so the process surface and the orchestrator's
  // checkpoint stage both see the same address the writer will push to.
  repositoryUrl: z.string().min(1),
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
  environment: environmentSummarySchema,
});
export type ProcessWorkSurfaceResponse = z.infer<typeof processWorkSurfaceResponseSchema>;

export const startProcessResponseSchema = z.object({
  process: processSurfaceSummarySchema,
  currentRequest: currentProcessRequestSchema.nullable(),
  environment: environmentSummarySchema,
});
export type StartProcessResponse = z.infer<typeof startProcessResponseSchema>;

export const resumeProcessResponseSchema = z.object({
  process: processSurfaceSummarySchema,
  currentRequest: currentProcessRequestSchema.nullable(),
  environment: environmentSummarySchema,
});
export type ResumeProcessResponse = z.infer<typeof resumeProcessResponseSchema>;

export const rehydrateProcessResponseSchema = z.object({
  accepted: z.literal(true),
  process: processSurfaceSummarySchema,
  currentRequest: currentProcessRequestSchema.nullable().default(null),
  environment: environmentSummarySchema,
});
export type RehydrateProcessResponse = z.infer<typeof rehydrateProcessResponseSchema>;

export const rebuildProcessResponseSchema = z.object({
  accepted: z.literal(true),
  process: processSurfaceSummarySchema,
  currentRequest: currentProcessRequestSchema.nullable().default(null),
  environment: environmentSummarySchema,
});
export type RebuildProcessResponse = z.infer<typeof rebuildProcessResponseSchema>;

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

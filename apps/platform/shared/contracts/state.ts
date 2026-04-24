import { z } from 'zod/v4';
import {
  artifactSectionEnvelopeSchema,
  authenticatedUserSchema,
  processSectionEnvelopeSchema,
  projectSummarySchema,
  requestErrorSchema,
  sourceAttachmentSectionEnvelopeSchema,
} from './schemas.js';
import {
  currentProcessRequestSchema,
  environmentSummarySchema,
  processHistorySectionEnvelopeSchema,
  processMaterialsSectionEnvelopeSchema,
  processSurfaceProjectSchema,
  processSurfaceSummarySchema,
  sideWorkSectionEnvelopeSchema,
} from './process-work-surface.js';
import {
  exportPackageResponseSchema,
  reviewWorkspaceResponseSchema,
  reviewWorkspaceSelectionSchema,
} from './review-workspace.js';

export const parsedRouteSchema = z
  .object({
    kind: z.enum(['project-index', 'project-shell', 'process-work-surface', 'review-workspace']),
    projectId: z.string().min(1).nullable(),
    selectedProcessId: z.string().min(1).nullable(),
    processId: z.string().min(1).nullable(),
    reviewSelection: reviewWorkspaceSelectionSchema.nullable().default(null),
  })
  .superRefine((value, context) => {
    if (value.kind === 'project-index' && value.projectId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project index routes cannot carry a projectId.',
      });
    }

    if (value.kind === 'project-index' && value.selectedProcessId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project index routes cannot carry a selected process id.',
      });
    }

    if (value.kind === 'project-index' && value.processId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project index routes cannot carry a process id.',
      });
    }

    if (value.kind === 'project-index' && value.reviewSelection !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project index routes cannot carry review selection state.',
      });
    }

    if (value.kind === 'project-shell' && value.projectId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project shell routes require a projectId.',
      });
    }

    if (value.kind === 'project-shell' && value.processId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project shell routes cannot carry a process id.',
      });
    }

    if (value.kind === 'project-shell' && value.reviewSelection !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project shell routes cannot carry review selection state.',
      });
    }

    if (value.kind === 'process-work-surface' && value.projectId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process work surface routes require a projectId.',
      });
    }

    if (value.kind === 'process-work-surface' && value.selectedProcessId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process work surface routes cannot carry a selected process id.',
      });
    }

    if (value.kind === 'process-work-surface' && value.processId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process work surface routes require a processId.',
      });
    }

    if (value.kind === 'process-work-surface' && value.reviewSelection !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process work surface routes cannot carry review selection state.',
      });
    }

    if (value.kind === 'review-workspace' && value.projectId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Review workspace routes require a projectId.',
      });
    }

    if (value.kind === 'review-workspace' && value.selectedProcessId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Review workspace routes cannot carry a selected process id.',
      });
    }

    if (value.kind === 'review-workspace' && value.processId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Review workspace routes require a processId.',
      });
    }
  });
export type ParsedRoute = z.infer<typeof parsedRouteSchema>;

export const processSurfaceLiveConnectionStateSchema = z.enum([
  'idle',
  'connecting',
  'connected',
  'reconnecting',
  'error',
]);
export type ProcessSurfaceLiveConnectionState = z.infer<
  typeof processSurfaceLiveConnectionStateSchema
>;

export const processSurfaceStateSchema = z.object({
  projectId: z.string().min(1).nullable(),
  processId: z.string().min(1).nullable(),
  project: processSurfaceProjectSchema.nullable(),
  process: processSurfaceSummarySchema.nullable(),
  history: processHistorySectionEnvelopeSchema.nullable(),
  materials: processMaterialsSectionEnvelopeSchema.nullable(),
  currentRequest: currentProcessRequestSchema.nullable(),
  sideWork: sideWorkSectionEnvelopeSchema.nullable(),
  environment: environmentSummarySchema.nullable().default(null),
  isLoading: z.boolean(),
  error: requestErrorSchema.nullable(),
  actionError: requestErrorSchema.nullable(),
  live: z.object({
    connectionState: processSurfaceLiveConnectionStateSchema,
    subscriptionId: z.string().min(1).nullable(),
    lastSequenceNumber: z.number().int().nonnegative().nullable(),
    error: requestErrorSchema.nullable(),
  }),
});
export type ProcessSurfaceState = z.infer<typeof processSurfaceStateSchema>;

export const reviewWorkspaceStateSchema = z.object({
  projectId: z.string().min(1).nullable(),
  processId: z.string().min(1).nullable(),
  selection: reviewWorkspaceSelectionSchema.nullable(),
  project: reviewWorkspaceResponseSchema.shape.project.nullable(),
  process: reviewWorkspaceResponseSchema.shape.process.nullable(),
  availableTargets: reviewWorkspaceResponseSchema.shape.availableTargets,
  target: reviewWorkspaceResponseSchema.shape.target.nullable(),
  isLoading: z.boolean(),
  error: requestErrorSchema.nullable(),
  exportState: z
    .object({
      isExporting: z.boolean(),
      lastExportByPackageId: z.record(z.string().min(1), exportPackageResponseSchema),
      error: requestErrorSchema.nullable(),
    })
    .default({
      isExporting: false,
      lastExportByPackageId: {},
      error: null,
    }),
});
export type ReviewWorkspaceState = z.infer<typeof reviewWorkspaceStateSchema>;

export const appStateSchema = z.object({
  auth: z.object({
    actor: authenticatedUserSchema.nullable(),
    isResolved: z.boolean(),
    csrfToken: z.string().min(1).nullable(),
  }),
  route: z.object({
    pathname: z.string().min(1),
    projectId: z.string().min(1).nullable(),
    selectedProcessId: z.string().min(1).nullable(),
  }),
  projects: z.object({
    list: z.array(projectSummarySchema).nullable(),
    isLoading: z.boolean(),
    error: requestErrorSchema.nullable(),
  }),
  shell: z.object({
    project: projectSummarySchema.nullable(),
    processes: processSectionEnvelopeSchema.nullable(),
    artifacts: artifactSectionEnvelopeSchema.nullable(),
    sourceAttachments: sourceAttachmentSectionEnvelopeSchema.nullable(),
    selectedProcessBanner: z.string().min(1).nullable(),
    isLoading: z.boolean(),
    error: requestErrorSchema.nullable(),
  }),
  processSurface: processSurfaceStateSchema,
  reviewWorkspace: reviewWorkspaceStateSchema,
  modals: z.object({
    createProjectOpen: z.boolean(),
    createProcessOpen: z.boolean(),
  }),
});
export type AppState = z.infer<typeof appStateSchema>;

import { z } from 'zod/v4';
import {
  artifactSectionEnvelopeSchema,
  authenticatedUserSchema,
  processSectionEnvelopeSchema,
  projectSummarySchema,
  requestErrorSchema,
  sourceAttachmentSectionEnvelopeSchema,
} from './schemas.js';

export const parsedRouteSchema = z
  .object({
    kind: z.enum(['project-index', 'project-shell']),
    projectId: z.string().min(1).nullable(),
    selectedProcessId: z.string().min(1).nullable(),
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

    if (value.kind === 'project-shell' && value.projectId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Project shell routes require a projectId.',
      });
    }
  });
export type ParsedRoute = z.infer<typeof parsedRouteSchema>;

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
  modals: z.object({
    createProjectOpen: z.boolean(),
    createProcessOpen: z.boolean(),
  }),
});
export type AppState = z.infer<typeof appStateSchema>;

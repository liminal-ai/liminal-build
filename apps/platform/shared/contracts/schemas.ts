import { z } from 'zod/v4';

export const supportedProcessTypeSchema = z.enum([
  'ProductDefinition',
  'FeatureSpecification',
  'FeatureImplementation',
]);
export type SupportedProcessType = z.infer<typeof supportedProcessTypeSchema>;

export const projectRoleSchema = z.enum(['owner', 'member']);
export type ProjectRole = z.infer<typeof projectRoleSchema>;

export const processStatusSchema = z.enum([
  'draft',
  'running',
  'waiting',
  'paused',
  'completed',
  'failed',
  'interrupted',
]);
export type ProcessStatus = z.infer<typeof processStatusSchema>;

export const processAvailableActionSchema = z.enum([
  'open',
  'respond',
  'resume',
  'review',
  'rehydrate',
  'restart',
]);
export type ProcessAvailableAction = z.infer<typeof processAvailableActionSchema>;

export const attachmentScopeSchema = z.enum(['project', 'process']);
export type AttachmentScope = z.infer<typeof attachmentScopeSchema>;

export const sourcePurposeSchema = z.enum(['research', 'review', 'implementation', 'other']);
export type SourcePurpose = z.infer<typeof sourcePurposeSchema>;

export const sourceAccessModeSchema = z.enum(['read_only', 'read_write']);
export type SourceAccessMode = z.infer<typeof sourceAccessModeSchema>;

export const hydrationStateSchema = z.enum(['not_hydrated', 'hydrated', 'stale', 'unavailable']);
export type HydrationState = z.infer<typeof hydrationStateSchema>;

export const requestErrorCodeSchema = z.enum([
  'NOT_IMPLEMENTED',
  'UNAUTHENTICATED',
  'PROJECT_FORBIDDEN',
  'PROJECT_NOT_FOUND',
  'PROCESS_NOT_FOUND',
  'PROJECT_NAME_CONFLICT',
  'INVALID_PROJECT_NAME',
  'INVALID_PROCESS_TYPE',
  'PROCESS_ACTION_NOT_AVAILABLE',
  'PROCESS_ACTION_FAILED',
  'PROCESS_ENVIRONMENT_NOT_RECOVERABLE',
  'PROCESS_ENVIRONMENT_PREREQUISITE_MISSING',
  'PROCESS_ENVIRONMENT_UNAVAILABLE',
  'INVALID_PROCESS_RESPONSE',
  'PROCESS_LIVE_UPDATES_UNAVAILABLE',
]);
export type RequestErrorCode = z.infer<typeof requestErrorCodeSchema>;

export const sectionStatusSchema = z.enum(['ready', 'empty', 'error']);
export type SectionStatus = z.infer<typeof sectionStatusSchema>;

export const authenticatedUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().nullable(),
  displayName: z.string().min(1).nullable(),
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export const authenticatedUserResponseSchema = z.object({
  user: authenticatedUserSchema,
});
export type AuthenticatedUserResponse = z.infer<typeof authenticatedUserResponseSchema>;

export const logoutResponseSchema = z.object({
  redirectUrl: z.string().url(),
});
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

export const sectionErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});
export type SectionError = z.infer<typeof sectionErrorSchema>;

const shellSectionEnvelopeBaseSchema = z.object({
  status: sectionStatusSchema,
  error: sectionErrorSchema.optional(),
});

export interface ShellSectionEnvelope<TItem> {
  status: SectionStatus;
  items: TItem[];
  error?: SectionError;
}

export const makeShellSectionEnvelopeSchema = <TItemSchema extends z.ZodTypeAny>(
  itemSchema: TItemSchema,
) =>
  shellSectionEnvelopeBaseSchema
    .extend({
      items: z.array(itemSchema),
    })
    .superRefine((value, context) => {
      if (value.status === 'error' && value.error === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Section envelopes in error state must include an error payload.',
        });
      }
    });

export const projectSummarySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  ownerDisplayName: z.string().min(1).nullable(),
  role: projectRoleSchema,
  processCount: z.number().int().nonnegative(),
  artifactCount: z.number().int().nonnegative(),
  sourceAttachmentCount: z.number().int().nonnegative(),
  lastUpdatedAt: z.string().min(1),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const processSummarySchema = z.object({
  processId: z.string().min(1),
  displayLabel: z.string().min(1),
  processType: supportedProcessTypeSchema,
  status: processStatusSchema,
  phaseLabel: z.string().min(1),
  nextActionLabel: z.string().min(1).nullable(),
  availableActions: z.array(processAvailableActionSchema),
  hasEnvironment: z.boolean(),
  updatedAt: z.string().min(1),
});
export type ProcessSummary = z.infer<typeof processSummarySchema>;

export const artifactSummarySchema = z.object({
  artifactId: z.string().min(1),
  displayName: z.string().min(1),
  currentVersionLabel: z.string().min(1).nullable(),
  attachmentScope: attachmentScopeSchema,
  processId: z.string().min(1).nullable(),
  processDisplayLabel: z.string().min(1).nullable(),
  updatedAt: z.string().min(1),
});
export type ArtifactSummary = z.infer<typeof artifactSummarySchema>;

export const sourceAttachmentSummarySchema = z.object({
  sourceAttachmentId: z.string().min(1),
  displayName: z.string().min(1),
  purpose: sourcePurposeSchema,
  accessMode: sourceAccessModeSchema,
  // Canonical clone URL for the source. `LocalProviderAdapter` uses this for
  // `git clone` at hydration, and `OctokitCodeCheckpointWriter` parses it to
  // resolve the GitHub `owner/repo` coordinates for direct writes back to the
  // attached writable target ref.
  repositoryUrl: z.string().min(1),
  targetRef: z.string().min(1).nullable(),
  hydrationState: hydrationStateSchema,
  attachmentScope: attachmentScopeSchema,
  processId: z.string().min(1).nullable(),
  processDisplayLabel: z.string().min(1).nullable(),
  updatedAt: z.string().min(1),
});
export type SourceAttachmentSummary = z.infer<typeof sourceAttachmentSummarySchema>;

export const processSectionErrorSchema = z.object({
  code: z.literal('PROJECT_SHELL_PROCESSES_LOAD_FAILED'),
  message: z.string().min(1),
});
export const artifactSectionErrorSchema = z.object({
  code: z.literal('PROJECT_SHELL_ARTIFACTS_LOAD_FAILED'),
  message: z.string().min(1),
});
export const sourceAttachmentSectionErrorSchema = z.object({
  code: z.literal('PROJECT_SHELL_SOURCES_LOAD_FAILED'),
  message: z.string().min(1),
});

export const processSectionEnvelopeSchema = makeShellSectionEnvelopeSchema(
  processSummarySchema,
).superRefine((value, context) => {
  if (value.status === 'error' && value.error !== undefined) {
    const result = processSectionErrorSchema.safeParse(value.error);
    if (!result.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process section errors must use the process section error code.',
      });
    }
  }
});
export type ProcessSectionEnvelope = z.infer<typeof processSectionEnvelopeSchema>;

export const artifactSectionEnvelopeSchema = makeShellSectionEnvelopeSchema(
  artifactSummarySchema,
).superRefine((value, context) => {
  if (value.status === 'error' && value.error !== undefined) {
    const result = artifactSectionErrorSchema.safeParse(value.error);
    if (!result.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Artifact section errors must use the artifact section error code.',
      });
    }
  }
});
export type ArtifactSectionEnvelope = z.infer<typeof artifactSectionEnvelopeSchema>;

export const sourceAttachmentSectionEnvelopeSchema = makeShellSectionEnvelopeSchema(
  sourceAttachmentSummarySchema,
).superRefine((value, context) => {
  if (value.status === 'error' && value.error !== undefined) {
    const result = sourceAttachmentSectionErrorSchema.safeParse(value.error);
    if (!result.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source section errors must use the source section error code.',
      });
    }
  }
});
export type SourceAttachmentSectionEnvelope = z.infer<typeof sourceAttachmentSectionEnvelopeSchema>;

export const projectShellResponseSchema = z.object({
  project: projectSummarySchema,
  processes: processSectionEnvelopeSchema,
  artifacts: artifactSectionEnvelopeSchema,
  sourceAttachments: sourceAttachmentSectionEnvelopeSchema,
});
export type ProjectShellResponse = z.infer<typeof projectShellResponseSchema>;

export const shellBootstrapPayloadSchema = z.object({
  actor: authenticatedUserSchema.nullable(),
  pathname: z.string().min(1),
  search: z.string(),
  csrfToken: z.string().min(1).nullable(),
  auth: z.object({
    loginPath: z.literal('/auth/login'),
    logoutPath: z.literal('/auth/logout'),
  }),
});
export type ShellBootstrapPayload = z.infer<typeof shellBootstrapPayloadSchema>;

export const createProjectRequestSchema = z.object({
  name: z.string().trim().min(1),
});
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const createProcessRequestSchema = z.object({
  processType: supportedProcessTypeSchema,
});
export type CreateProcessRequest = z.infer<typeof createProcessRequestSchema>;

export const createProcessResponseSchema = z.object({
  process: processSummarySchema,
});
export type CreateProcessResponse = z.infer<typeof createProcessResponseSchema>;

export const requestErrorSchema = z.object({
  code: requestErrorCodeSchema,
  message: z.string().min(1),
  status: z.number().int().positive(),
});
export type RequestError = z.infer<typeof requestErrorSchema>;

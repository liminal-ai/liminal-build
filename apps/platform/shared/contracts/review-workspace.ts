import { z } from 'zod/v4';
import { projectRoleSchema, supportedProcessTypeSchema } from './schemas.js';

export const reviewWorkspaceRouteTemplate =
  '/projects/{projectId}/processes/{processId}/review' as const;
export const reviewWorkspaceRoutePathnamePattern =
  '/projects/:projectId/processes/:processId/review' as const;
export const reviewWorkspaceApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/review' as const;
export const reviewArtifactApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/review/artifacts/:artifactId' as const;
export const reviewPackageApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/review/packages/:packageId' as const;
export const reviewPackageExportApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/review/packages/:packageId/export' as const;
export const reviewExportDownloadApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/review/exports/:exportId' as const;

export const reviewWorkspaceRouteParamsSchema = z.object({
  projectId: z.string().min(1),
  processId: z.string().min(1),
});
export type ReviewWorkspaceRouteParams = z.infer<typeof reviewWorkspaceRouteParamsSchema>;

export function buildReviewWorkspacePath(args: ReviewWorkspaceRouteParams): string {
  return `/projects/${args.projectId}/processes/${args.processId}/review`;
}

export function buildReviewWorkspaceApiPath(args: ReviewWorkspaceRouteParams): string {
  return `/api${buildReviewWorkspacePath(args)}`;
}

export function buildReviewArtifactApiPath(
  args: ReviewWorkspaceRouteParams & { artifactId: string },
): string {
  return `${buildReviewWorkspaceApiPath(args)}/artifacts/${args.artifactId}`;
}

export function buildReviewPackageApiPath(
  args: ReviewWorkspaceRouteParams & { packageId: string },
): string {
  return `${buildReviewWorkspaceApiPath(args)}/packages/${args.packageId}`;
}

export function buildReviewPackageExportApiPath(
  args: ReviewWorkspaceRouteParams & { packageId: string },
): string {
  return `${buildReviewPackageApiPath(args)}/export`;
}

export function buildReviewExportDownloadApiPath(
  args: ReviewWorkspaceRouteParams & { exportId: string },
): string {
  return `${buildReviewWorkspaceApiPath(args)}/exports/${args.exportId}`;
}

export const reviewTargetKindSchema = z.enum(['artifact', 'package']);
export type ReviewTargetKind = z.infer<typeof reviewTargetKindSchema>;

export const reviewTargetStatusSchema = z.enum([
  'ready',
  'empty',
  'error',
  'unsupported',
  'unavailable',
]);
export type ReviewTargetStatus = z.infer<typeof reviewTargetStatusSchema>;

export const artifactContentKindSchema = z.enum(['markdown', 'unsupported']);
export type ArtifactContentKind = z.infer<typeof artifactContentKindSchema>;

export const artifactBodyStatusSchema = z.enum(['ready', 'error']);
export type ArtifactBodyStatus = z.infer<typeof artifactBodyStatusSchema>;

export const packageMemberStatusSchema = z.enum(['ready', 'unsupported', 'unavailable']);
export type PackageMemberStatus = z.infer<typeof packageMemberStatusSchema>;

export const exportPackageFormatSchema = z.literal('mpkz');
export type ExportPackageFormat = z.infer<typeof exportPackageFormatSchema>;

const iso8601UtcString = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/);

export const reviewWorkspaceSelectionSchema = z.object({
  targetKind: reviewTargetKindSchema.optional(),
  targetId: z.string().min(1).optional(),
  versionId: z.string().min(1).optional(),
  memberId: z.string().min(1).optional(),
});
export type ReviewWorkspaceSelection = z.infer<typeof reviewWorkspaceSelectionSchema>;

export const reviewTargetSummarySchema = z.object({
  position: z.number().int().nonnegative(),
  targetKind: reviewTargetKindSchema,
  targetId: z.string().min(1),
  displayName: z.string().min(1),
});
export type ReviewTargetSummary = z.infer<typeof reviewTargetSummarySchema>;

export const artifactVersionSummarySchema = z.object({
  versionId: z.string().min(1),
  versionLabel: z.string().min(1),
  isCurrent: z.boolean(),
  createdAt: iso8601UtcString,
});
export type ArtifactVersionSummary = z.infer<typeof artifactVersionSummarySchema>;

export const mermaidBlockSchema = z.object({
  blockId: z.string().min(1),
  source: z.string().min(1),
});
export type MermaidBlock = z.infer<typeof mermaidBlockSchema>;

export const reviewTargetErrorCodeSchema = z.enum([
  'REVIEW_TARGET_UNSUPPORTED',
  'REVIEW_RENDER_FAILED',
  'REVIEW_MEMBER_UNAVAILABLE',
]);
export type ReviewTargetErrorCode = z.infer<typeof reviewTargetErrorCodeSchema>;

export const reviewTargetErrorSchema = z.object({
  code: reviewTargetErrorCodeSchema,
  message: z.string().min(1),
});
export type ReviewTargetError = z.infer<typeof reviewTargetErrorSchema>;

export const artifactVersionDetailSchema = z
  .object({
    versionId: z.string().min(1),
    versionLabel: z.string().min(1),
    contentKind: artifactContentKindSchema,
    bodyStatus: artifactBodyStatusSchema.optional(),
    body: z.string().min(1).optional(),
    bodyError: reviewTargetErrorSchema.optional(),
    mermaidBlocks: z.array(mermaidBlockSchema).optional(),
    createdAt: iso8601UtcString,
  })
  .superRefine((value, context) => {
    if (value.contentKind === 'unsupported') {
      if (value.bodyStatus !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unsupported artifact versions cannot include a body status.',
          path: ['bodyStatus'],
        });
      }

      if (value.body !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unsupported artifact versions cannot include a body.',
          path: ['body'],
        });
      }

      if (value.bodyError !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unsupported artifact versions cannot include a body error.',
          path: ['bodyError'],
        });
      }

      if (value.mermaidBlocks !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unsupported artifact versions cannot include Mermaid blocks.',
          path: ['mermaidBlocks'],
        });
      }

      return;
    }

    if (value.bodyStatus === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Markdown artifact versions must include a body status.',
        path: ['bodyStatus'],
      });
      return;
    }

    if (value.bodyStatus === 'ready') {
      if (value.body === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ready markdown artifact versions must include a body.',
          path: ['body'],
        });
      }

      if (value.bodyError !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ready markdown artifact versions cannot include a body error.',
          path: ['bodyError'],
        });
      }
    }

    if (value.bodyStatus === 'error') {
      if (value.bodyError === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Errored markdown artifact versions must include a body error.',
          path: ['bodyError'],
        });
      }

      if (value.body !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Errored markdown artifact versions cannot include a body.',
          path: ['body'],
        });
      }

      if (value.mermaidBlocks !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Errored markdown artifact versions cannot include Mermaid blocks.',
          path: ['mermaidBlocks'],
        });
      }
    }
  });
export type ArtifactVersionDetail = z.infer<typeof artifactVersionDetailSchema>;

export const artifactReviewTargetSchema = z.object({
  artifactId: z.string().min(1),
  displayName: z.string().min(1),
  currentVersionId: z.string().min(1).optional(),
  currentVersionLabel: z.string().min(1).optional(),
  selectedVersionId: z.string().min(1).optional(),
  versions: z.array(artifactVersionSummarySchema),
  selectedVersion: artifactVersionDetailSchema.optional(),
});
export type ArtifactReviewTarget = z.infer<typeof artifactReviewTargetSchema>;

export const packageMemberSchema = z.object({
  memberId: z.string().min(1),
  position: z.number().int().nonnegative(),
  artifactId: z.string().min(1),
  displayName: z.string().min(1),
  versionId: z.string().min(1),
  versionLabel: z.string().min(1),
  status: packageMemberStatusSchema,
});
export type PackageMember = z.infer<typeof packageMemberSchema>;

export const packageExportabilitySchema = z.union([
  z.object({
    available: z.literal(true),
  }),
  z.object({
    available: z.literal(false),
    reason: z.string().min(1),
  }),
]);
export type PackageExportability = z.infer<typeof packageExportabilitySchema>;

export const packageMemberReviewSchema = z
  .object({
    memberId: z.string().min(1),
    status: packageMemberStatusSchema,
    error: reviewTargetErrorSchema.optional(),
    artifact: artifactReviewTargetSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'ready' && value.artifact === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ready package members must include artifact details.',
        path: ['artifact'],
      });
    }

    if (value.status === 'ready' && value.error !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ready package members cannot include an error payload.',
        path: ['error'],
      });
    }

    if (value.status !== 'ready' && value.error === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unavailable or unsupported package members must include an error payload.',
        path: ['error'],
      });
    }

    if (value.status !== 'ready' && value.artifact !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unavailable or unsupported package members cannot include artifact details.',
        path: ['artifact'],
      });
    }
  });
export type PackageMemberReview = z.infer<typeof packageMemberReviewSchema>;

export const packageReviewTargetSchema = z.object({
  packageId: z.string().min(1),
  displayName: z.string().min(1),
  packageType: z.string().min(1),
  members: z.array(packageMemberSchema),
  selectedMemberId: z.string().min(1).optional(),
  selectedMember: packageMemberReviewSchema.optional(),
  exportability: packageExportabilitySchema,
});
export type PackageReviewTarget = z.infer<typeof packageReviewTargetSchema>;

export const reviewTargetSchema = z
  .object({
    targetKind: reviewTargetKindSchema,
    displayName: z.string().min(1),
    status: reviewTargetStatusSchema,
    error: reviewTargetErrorSchema.optional(),
    artifact: artifactReviewTargetSchema.optional(),
    package: packageReviewTargetSchema.optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.status === 'error' ||
        value.status === 'unsupported' ||
        value.status === 'unavailable') &&
      value.error === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Errored, unsupported, and unavailable review targets must include an error payload.',
        path: ['error'],
      });
    }

    if ((value.status === 'ready' || value.status === 'empty') && value.error !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ready and empty review targets cannot include an error payload.',
        path: ['error'],
      });
    }

    if (
      value.targetKind === 'artifact' &&
      value.artifact === undefined &&
      value.status === 'ready'
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ready artifact review targets must include artifact details.',
      });
    }

    if (value.targetKind === 'artifact' && value.package !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Artifact review targets cannot include package details.',
        path: ['package'],
      });
    }

    if (value.targetKind === 'package' && value.package === undefined && value.status === 'ready') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ready package review targets must include package details.',
      });
    }

    if (value.targetKind === 'package' && value.artifact !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Package review targets cannot include artifact details.',
        path: ['artifact'],
      });
    }
  });
export type ReviewTarget = z.infer<typeof reviewTargetSchema>;

export const reviewWorkspaceProjectContextSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  role: projectRoleSchema,
});
export type ReviewWorkspaceProjectContext = z.infer<typeof reviewWorkspaceProjectContextSchema>;

export const processReviewContextSchema = z.object({
  processId: z.string().min(1),
  displayLabel: z.string().min(1),
  processType: supportedProcessTypeSchema,
  reviewTargetKind: reviewTargetKindSchema.optional(),
  reviewTargetId: z.string().min(1).optional(),
});
export type ProcessReviewContext = z.infer<typeof processReviewContextSchema>;

export const reviewWorkspaceResponseSchema = z.object({
  project: reviewWorkspaceProjectContextSchema,
  process: processReviewContextSchema,
  availableTargets: z.array(reviewTargetSummarySchema),
  target: reviewTargetSchema.optional(),
});
export type ReviewWorkspaceResponse = z.infer<typeof reviewWorkspaceResponseSchema>;

export const exportPackageResponseSchema = z.object({
  exportId: z.string().min(1),
  downloadName: z.string().min(1),
  downloadUrl: z.string().min(1),
  contentType: z.literal('application/gzip'),
  packageFormat: exportPackageFormatSchema,
  expiresAt: iso8601UtcString,
});
export type ExportPackageResponse = z.infer<typeof exportPackageResponseSchema>;

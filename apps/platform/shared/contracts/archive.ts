import { z } from 'zod/v4';

const iso8601UtcString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/)
  .refine(
    (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return date.toISOString().startsWith(value.slice(0, -1));
    },
    {
      message: 'Timestamp must be a semantically valid ISO 8601 UTC date.',
    },
  );

export const processArchiveRouteTemplate =
  '/projects/{projectId}/processes/{processId}/archive' as const;
export const processArchiveRoutePathnamePattern =
  '/projects/:projectId/processes/:processId/archive' as const;
export const processArchiveApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/archive' as const;
export const processArchiveTurnsApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/archive/turns' as const;
export const processDerivedArchiveViewsApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/archive/derived-views' as const;
export const processDerivedArchiveViewsRefreshApiPathnamePattern =
  '/api/projects/:projectId/processes/:processId/archive/derived-views/refresh' as const;

export const archiveRouteParamsSchema = z.object({
  projectId: z.string().min(1),
  processId: z.string().min(1),
});
export type ArchiveRouteParams = z.infer<typeof archiveRouteParamsSchema>;

export function buildProcessArchivePath(args: ArchiveRouteParams): string {
  return `/projects/${args.projectId}/processes/${args.processId}/archive`;
}

export function buildProcessArchiveApiPath(args: ArchiveRouteParams): string {
  return `/api${buildProcessArchivePath(args)}`;
}

export function buildProcessArchiveTurnsApiPath(args: ArchiveRouteParams): string {
  return `${buildProcessArchiveApiPath(args)}/turns`;
}

export function buildProcessDerivedArchiveViewsApiPath(args: ArchiveRouteParams): string {
  return `${buildProcessArchiveApiPath(args)}/derived-views`;
}

export function buildProcessDerivedArchiveViewsRefreshApiPath(args: ArchiveRouteParams): string {
  return `${buildProcessDerivedArchiveViewsApiPath(args)}/refresh`;
}

export const archiveEntryKindSchema = z.enum([
  'user_message',
  'model_message',
  'reasoning',
  'script_emission',
  'tool_call',
  'tool_result',
  'process_event',
]);
export type ArchiveEntryKind = z.infer<typeof archiveEntryKindSchema>;

export const archiveLifecycleStateSchema = z.literal('finalized');
export type ArchiveLifecycleState = z.infer<typeof archiveLifecycleStateSchema>;

export const archiveBodyFormatSchema = z.enum(['plain_text', 'markdown', 'structured', 'none']);
export type ArchiveBodyFormat = z.infer<typeof archiveBodyFormatSchema>;

export const archiveEntryStatusSchema = z.enum(['ready', 'degraded']);
export type ArchiveEntryStatus = z.infer<typeof archiveEntryStatusSchema>;

export const derivedArchiveViewKindSchema = z.enum(['turn_range', 'chunk_candidate']);
export type DerivedArchiveViewKind = z.infer<typeof derivedArchiveViewKindSchema>;

export const derivedArchiveViewRefreshStatusSchema = z.enum(['settled', 'accepted', 'degraded']);
export type DerivedArchiveViewRefreshStatus = z.infer<typeof derivedArchiveViewRefreshStatusSchema>;

export const archivePageCursorSchema = z.string().min(1).nullable();
export type ArchivePageCursor = z.infer<typeof archivePageCursorSchema>;

export const archivePaginationQuerySchema = z.object({
  cursor: archivePageCursorSchema.optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type ArchivePaginationQuery = z.infer<typeof archivePaginationQuerySchema>;

export const archiveTurnPaginationQuerySchema = z.object({
  cursor: archivePageCursorSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type ArchiveTurnPaginationQuery = z.infer<typeof archiveTurnPaginationQuerySchema>;

export const archiveDerivedViewRefreshRequestSchema = z.object({}).strict();
export type ArchiveDerivedViewRefreshRequest = z.infer<
  typeof archiveDerivedViewRefreshRequestSchema
>;

export const archiveEntryBodyDataSchema = z.object({
  jsonText: z.string(),
});
export type ArchiveEntryBodyData = z.infer<typeof archiveEntryBodyDataSchema>;

export const archiveEntryArtifactProvenanceSchema = z.object({
  versionId: z.string().min(1),
  artifactId: z.string().min(1),
  versionLabel: z.string().min(1),
  createdAt: iso8601UtcString,
  producedByProcessId: z.string().min(1),
  producedByProcessDisplayLabel: z.string().min(1).nullable(),
});
export type ArchiveEntryArtifactProvenance = z.infer<typeof archiveEntryArtifactProvenanceSchema>;

export const archiveEntrySourceProvenanceSchema = z
  .object({
    provenanceId: z.string().min(1),
    sourceAttachmentId: z.string().min(1).nullable(),
    relationshipKind: z.enum(['informed_work', 'received_code_update']),
    repositoryFullName: z.string().min(1),
    repositoryUrl: z.string().min(1),
    targetRef: z.string().min(1).nullable(),
    entryStatus: archiveEntryStatusSchema,
    degradationReason: z.string().min(1).nullable(),
    recordedAt: iso8601UtcString,
  })
  .superRefine((value, context) => {
    if (value.entryStatus === 'degraded' && value.degradationReason === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Degraded source provenance must include a degradation reason.',
        path: ['degradationReason'],
      });
    }
  });
export type ArchiveEntrySourceProvenance = z.infer<typeof archiveEntrySourceProvenanceSchema>;

export const archivePageInfoSchema = z.object({
  cursor: archivePageCursorSchema,
  nextCursor: archivePageCursorSchema,
  hasMore: z.boolean(),
});
export type ArchivePageInfo = z.infer<typeof archivePageInfoSchema>;

export const archiveEntrySchema = z
  .object({
    archiveEntryId: z.string().min(1),
    projectId: z.string().min(1),
    processId: z.string().min(1),
    entryKind: archiveEntryKindSchema,
    sequence: z.number().int().nonnegative(),
    lifecycleState: archiveLifecycleStateSchema,
    finalizationKey: z.string().min(1),
    sourceObjectId: z.string().min(1).nullable(),
    bodyText: z.string().min(1).nullable(),
    bodyData: archiveEntryBodyDataSchema.nullable(),
    bodyFormat: archiveBodyFormatSchema,
    relatedArtifactVersionId: z.string().min(1).nullable(),
    relatedSourceProvenanceId: z.string().min(1).nullable(),
    relatedToolCallId: z.string().min(1).nullable(),
    relatedArtifactProvenance: archiveEntryArtifactProvenanceSchema.optional(),
    relatedSourceProvenance: archiveEntrySourceProvenanceSchema.optional(),
    entryStatus: archiveEntryStatusSchema,
    degradationReason: z.string().min(1).nullable(),
    recordedAt: iso8601UtcString,
  })
  .superRefine((value, context) => {
    if (value.entryStatus === 'degraded' && value.degradationReason === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Degraded archive entries must include a degradation reason.',
        path: ['degradationReason'],
      });
    }

    if (value.bodyFormat === 'structured' && value.bodyData === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Structured archive entries must include bodyData.',
        path: ['bodyData'],
      });
    }

    if (value.bodyFormat === 'none' && (value.bodyText !== null || value.bodyData !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Archive entries with bodyFormat 'none' cannot include body content.",
        path: ['bodyFormat'],
      });
    }
  });
export type ArchiveEntry = z.infer<typeof archiveEntrySchema>;

export const archivePageSchema = z.object({
  entries: z.array(archiveEntrySchema),
  page: archivePageInfoSchema,
});
export type ArchivePage = z.infer<typeof archivePageSchema>;

export const derivedTurnSchema = z
  .object({
    turnId: z.string().min(1),
    processId: z.string().min(1),
    turnIndex: z.number().int().nonnegative(),
    archiveEntryIds: z.array(z.string().min(1)).min(1),
    startedAt: iso8601UtcString,
    endedAt: iso8601UtcString,
    turnStatus: archiveEntryStatusSchema,
    degradationReason: z.string().min(1).nullable(),
  })
  .superRefine((value, context) => {
    if (value.turnStatus === 'degraded' && value.degradationReason === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Degraded turns must include a degradation reason.',
        path: ['degradationReason'],
      });
    }
  });
export type DerivedTurn = z.infer<typeof derivedTurnSchema>;

export const archiveTurnPageSchema = z.object({
  turns: z.array(derivedTurnSchema),
  page: archivePageInfoSchema,
});
export type ArchiveTurnPage = z.infer<typeof archiveTurnPageSchema>;

export const derivedArchiveViewTurnRangeSchema = z
  .object({
    startIndex: z.number().int().nonnegative(),
    endIndex: z.number().int().nonnegative(),
  })
  .superRefine((value, context) => {
    if (value.endIndex < value.startIndex) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Turn ranges must end at or after their start index.',
        path: ['endIndex'],
      });
    }
  });
export type DerivedArchiveViewTurnRange = z.infer<typeof derivedArchiveViewTurnRangeSchema>;

export const derivedArchiveViewSchema = z
  .object({
    derivedViewId: z.string().min(1),
    processId: z.string().min(1),
    viewKind: derivedArchiveViewKindSchema,
    turnRange: derivedArchiveViewTurnRangeSchema.nullable(),
    sourceTurnIds: z.array(z.string().min(1)).min(1),
    sourceArchiveEntryIds: z.array(z.string().min(1)).min(1),
    title: z.string().min(1).nullable(),
    bodyText: z.string().min(1).nullable(),
    viewStatus: archiveEntryStatusSchema,
    degradationReason: z.string().min(1).nullable(),
    updatedAt: iso8601UtcString,
  })
  .superRefine((value, context) => {
    if (value.viewKind === 'turn_range' && value.turnRange === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Turn-range views must include turnRange metadata.',
        path: ['turnRange'],
      });
    }

    if (value.viewStatus === 'degraded' && value.degradationReason === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Degraded derived views must include a degradation reason.',
        path: ['degradationReason'],
      });
    }
  });
export type DerivedArchiveView = z.infer<typeof derivedArchiveViewSchema>;

export const derivedArchiveViewListResponseSchema = z.object({
  views: z.array(derivedArchiveViewSchema),
});
export type DerivedArchiveViewListResponse = z.infer<typeof derivedArchiveViewListResponseSchema>;

export const derivedArchiveViewRefreshResponseSchema = z.object({
  views: z.array(derivedArchiveViewSchema),
  refreshStatus: derivedArchiveViewRefreshStatusSchema,
});
export type DerivedArchiveViewRefreshResponse = z.infer<
  typeof derivedArchiveViewRefreshResponseSchema
>;

export const archiveErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'PROJECT_FORBIDDEN',
  'PROJECT_NOT_FOUND',
  'PROCESS_NOT_FOUND',
  'ARCHIVE_DERIVATION_CONFLICT',
  'INVALID_ARCHIVE_REQUEST',
]);
export type ArchiveErrorCode = z.infer<typeof archiveErrorCodeSchema>;

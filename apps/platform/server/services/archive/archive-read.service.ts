import type {
  ArchiveEntry,
  ArchivePage,
  ArchiveEntryArtifactProvenance,
  ArchiveEntrySourceProvenance,
} from '../../../shared/contracts/index.js';
import { archivePageSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { invalidArchiveRequestErrorCode } from '../../errors/codes.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { ProcessAccessService } from '../processes/process-access.service.js';
import type {
  ArtifactVersionRecord,
  PlatformStore,
  StoredSourceProvenanceRecord,
} from '../projects/platform-store.js';

const DEFAULT_ARCHIVE_PAGE_LIMIT = 100;
const MAX_ARCHIVE_PAGE_LIMIT = 200;

export interface ArchiveReadService {
  getArchive(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    cursor?: string | null;
    limit?: number;
  }): Promise<ArchivePage>;
}

export class DefaultArchiveReadService implements ArchiveReadService {
  constructor(
    private readonly platformStore: Pick<
      PlatformStore,
      'getArtifactVersion' | 'listArchiveEntries'
    > & {
      listProcessesByIds?: PlatformStore['listProcessesByIds'];
      listProcessSourceProvenance?: PlatformStore['listProcessSourceProvenance'];
    },
    private readonly processAccessService: Pick<ProcessAccessService, 'assertProcessAccess'>,
  ) {}

  async getArchive(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    cursor?: string | null;
    limit?: number;
  }): Promise<ArchivePage> {
    await this.processAccessService.assertProcessAccess({
      actor: args.actor,
      projectId: args.projectId,
      processId: args.processId,
    });

    const cursor = normalizeArchiveCursor(args.cursor);
    const limit = normalizeArchiveLimit(args.limit);
    const page = await this.platformStore.listArchiveEntries({
      processId: args.processId,
      cursor,
      limit,
    });
    const entries = await enrichArchiveEntries({
      entries: page.entries,
      platformStore: this.platformStore,
      processId: args.processId,
    });

    return archivePageSchema.parse({
      ...page,
      entries,
    });
  }
}

async function enrichArchiveEntries(args: {
  entries: ArchiveEntry[];
  platformStore: Pick<PlatformStore, 'getArtifactVersion'> & {
    listProcessesByIds?: PlatformStore['listProcessesByIds'];
    listProcessSourceProvenance?: PlatformStore['listProcessSourceProvenance'];
  };
  processId: string;
}): Promise<ArchiveEntry[]> {
  const artifactVersionIds = Array.from(
    new Set(
      args.entries
        .map((entry) => entry.relatedArtifactVersionId)
        .filter((versionId): versionId is string => versionId !== null),
    ),
  );
  const sourceProvenanceIds = new Set(
    args.entries
      .map((entry) => entry.relatedSourceProvenanceId)
      .filter((provenanceId): provenanceId is string => provenanceId !== null),
  );
  const artifactVersions = await Promise.all(
    artifactVersionIds.map(async (versionId) => {
      try {
        return [versionId, await args.platformStore.getArtifactVersion({ versionId })] as const;
      } catch {
        return [versionId, null] as const;
      }
    }),
  );
  const artifactVersionsById = new Map<string, ArtifactVersionRecord | null>(artifactVersions);
  const producingProcessIds = Array.from(
    new Set(
      artifactVersions
        .map(([, version]) => version?.createdByProcessId ?? null)
        .filter((processId): processId is string => processId !== null),
    ),
  );
  const processes =
    args.platformStore.listProcessesByIds === undefined || producingProcessIds.length === 0
      ? []
      : await loadProcessesByIds(args.platformStore, producingProcessIds);
  const processDisplayLabelsById = new Map(
    processes.map((processRecord) => [processRecord.processId, processRecord.displayLabel]),
  );
  const sourceRecords =
    args.platformStore.listProcessSourceProvenance === undefined || sourceProvenanceIds.size === 0
      ? []
      : await loadSourceProvenanceRecords(args.platformStore, args.processId);
  const sourceRecordsById = new Map(
    sourceRecords.map((record) => [record.provenanceId, record] as const),
  );

  return args.entries.map((entry) =>
    buildEnrichedArchiveEntry(entry, {
      artifactVersion: resolveArtifactVersion(entry, artifactVersionsById),
      producingProcessDisplayLabelsById: processDisplayLabelsById,
      sourceRecord: resolveSourceRecord(entry, sourceProvenanceIds, sourceRecordsById),
    }),
  );
}

function resolveArtifactVersion(
  entry: ArchiveEntry,
  artifactVersionsById: Map<string, ArtifactVersionRecord | null>,
): ArtifactVersionRecord | null {
  if (entry.relatedArtifactVersionId === null) {
    return null;
  }

  return artifactVersionsById.get(entry.relatedArtifactVersionId) ?? null;
}

function resolveSourceRecord(
  entry: ArchiveEntry,
  sourceProvenanceIds: Set<string>,
  sourceRecordsById: Map<string, StoredSourceProvenanceRecord>,
): StoredSourceProvenanceRecord | null {
  if (
    entry.relatedSourceProvenanceId === null ||
    !sourceProvenanceIds.has(entry.relatedSourceProvenanceId)
  ) {
    return null;
  }

  return sourceRecordsById.get(entry.relatedSourceProvenanceId) ?? null;
}

function buildEnrichedArchiveEntry(
  entry: ArchiveEntry,
  args: {
    artifactVersion: ArtifactVersionRecord | null;
    producingProcessDisplayLabelsById: Map<string, string>;
    sourceRecord: StoredSourceProvenanceRecord | null;
  },
): ArchiveEntry {
  const degradationReasons = entry.degradationReason === null ? [] : [entry.degradationReason];
  let relatedArtifactProvenance: ArchiveEntryArtifactProvenance | undefined;
  let relatedSourceProvenance: ArchiveEntrySourceProvenance | undefined;

  if (entry.relatedArtifactVersionId !== null) {
    if (args.artifactVersion === null) {
      degradationReasons.push('Related artifact version is unavailable.');
    } else {
      const producedByProcessDisplayLabel =
        args.producingProcessDisplayLabelsById.get(args.artifactVersion.createdByProcessId) ?? null;
      relatedArtifactProvenance = {
        versionId: args.artifactVersion.versionId,
        artifactId: args.artifactVersion.artifactId,
        versionLabel: args.artifactVersion.versionLabel,
        createdAt: args.artifactVersion.createdAt,
        producedByProcessId: args.artifactVersion.createdByProcessId,
        producedByProcessDisplayLabel,
      };

      if (producedByProcessDisplayLabel === null) {
        degradationReasons.push(
          'Producing process provenance is unavailable for the related artifact version.',
        );
      }
    }
  }

  if (entry.relatedSourceProvenanceId !== null) {
    if (args.sourceRecord === null) {
      degradationReasons.push('Related source provenance is unavailable.');
    } else {
      relatedSourceProvenance = {
        provenanceId: args.sourceRecord.provenanceId,
        sourceAttachmentId: args.sourceRecord.sourceAttachmentId,
        relationshipKind: args.sourceRecord.relationshipKind,
        repositoryFullName: args.sourceRecord.repositoryFullName,
        repositoryUrl: args.sourceRecord.repositoryUrl,
        targetRef: args.sourceRecord.targetRef,
        entryStatus: args.sourceRecord.entryStatus,
        degradationReason: args.sourceRecord.degradationReason,
        recordedAt: args.sourceRecord.recordedAt,
      };
    }
  }

  const nextDegradationReason = dedupeStrings(degradationReasons).join(' ') || null;

  return {
    ...entry,
    ...(relatedArtifactProvenance === undefined ? {} : { relatedArtifactProvenance }),
    ...(relatedSourceProvenance === undefined ? {} : { relatedSourceProvenance }),
    entryStatus: nextDegradationReason === null ? 'ready' : 'degraded',
    degradationReason: nextDegradationReason,
  };
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

async function loadProcessesByIds(
  platformStore: {
    listProcessesByIds?: PlatformStore['listProcessesByIds'];
  },
  processIds: string[],
): Promise<Array<Awaited<ReturnType<NonNullable<PlatformStore['listProcessesByIds']>>>[number]>> {
  if (platformStore.listProcessesByIds === undefined || processIds.length === 0) {
    return [];
  }

  try {
    return await platformStore.listProcessesByIds({
      processIds,
    });
  } catch {
    return [];
  }
}

async function loadSourceProvenanceRecords(
  platformStore: {
    listProcessSourceProvenance?: PlatformStore['listProcessSourceProvenance'];
  },
  processId: string,
): Promise<StoredSourceProvenanceRecord[]> {
  if (platformStore.listProcessSourceProvenance === undefined) {
    return [];
  }

  try {
    return await platformStore.listProcessSourceProvenance({
      processId,
    });
  } catch {
    return [];
  }
}

function normalizeArchiveCursor(cursor: string | null | undefined): string | null {
  if (cursor === undefined || cursor === null) {
    return null;
  }

  if (!/^\d+$/.test(cursor)) {
    throw new AppError({
      code: invalidArchiveRequestErrorCode,
      message: 'Archive pagination parameters were invalid.',
      statusCode: 422,
    });
  }

  return cursor;
}

function normalizeArchiveLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_ARCHIVE_PAGE_LIMIT;
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_ARCHIVE_PAGE_LIMIT) {
    throw new AppError({
      code: invalidArchiveRequestErrorCode,
      message: 'Archive pagination parameters were invalid.',
      statusCode: 422,
    });
  }

  return limit;
}

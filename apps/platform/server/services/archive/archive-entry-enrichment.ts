import type {
  ArchiveEntry,
  ArchiveEntryArtifactProvenance,
  ArchiveEntrySourceProvenance,
  SourceProvenanceEntry,
} from '../../../shared/contracts/index.js';
import type { SourceProvenanceService } from '../sources/source-provenance.service.js';
import type { ArtifactVersionRecord, PlatformStore } from '../projects/platform-store.js';

export async function enrichArchiveEntries(args: {
  entries: ArchiveEntry[];
  projectId: string;
  processId: string;
  platformStore: Pick<PlatformStore, 'getArtifactVersion'> & {
    listProcessesByIds?: PlatformStore['listProcessesByIds'];
  };
  sourceProvenanceService?: Pick<SourceProvenanceService, 'listProcessSourceProvenance'>;
}): Promise<ArchiveEntry[]> {
  const artifactVersionIds = Array.from(
    new Set(
      args.entries
        .map((entry) => entry.relatedArtifactVersionId)
        .filter((versionId): versionId is string => versionId !== null),
    ),
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
  const sourceProvenanceEntries =
    args.sourceProvenanceService === undefined
      ? []
      : await loadSourceProvenanceEntries(args.sourceProvenanceService, {
          projectId: args.projectId,
          processId: args.processId,
        });
  const sourceEntriesById = new Map(
    sourceProvenanceEntries.map((entry) => [entry.provenanceId, entry] as const),
  );

  return args.entries.map((entry) =>
    buildEnrichedArchiveEntry(entry, {
      artifactVersion: resolveArtifactVersion(entry, artifactVersionsById),
      producingProcessDisplayLabelsById: processDisplayLabelsById,
      sourceEntry:
        entry.relatedSourceProvenanceId === null
          ? null
          : (sourceEntriesById.get(entry.relatedSourceProvenanceId) ?? null),
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

function buildEnrichedArchiveEntry(
  entry: ArchiveEntry,
  args: {
    artifactVersion: ArtifactVersionRecord | null;
    producingProcessDisplayLabelsById: Map<string, string>;
    sourceEntry: SourceProvenanceEntry | null;
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
    if (args.sourceEntry === null) {
      degradationReasons.push('Related source provenance is unavailable.');
    } else {
      relatedSourceProvenance = {
        provenanceId: args.sourceEntry.provenanceId,
        sourceAttachmentId: args.sourceEntry.sourceAttachmentId,
        relationshipKind: args.sourceEntry.relationshipKind,
        repositoryFullName: args.sourceEntry.repositoryFullName,
        repositoryUrl: args.sourceEntry.repositoryUrl,
        targetRef: args.sourceEntry.targetRef,
        entryStatus: args.sourceEntry.entryStatus,
        degradationReason: args.sourceEntry.degradationReason,
        recordedAt: args.sourceEntry.recordedAt,
      };

      if (
        args.sourceEntry.entryStatus === 'degraded' &&
        args.sourceEntry.degradationReason !== null
      ) {
        degradationReasons.push(args.sourceEntry.degradationReason);
      }
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

async function loadSourceProvenanceEntries(
  sourceProvenanceService: Pick<SourceProvenanceService, 'listProcessSourceProvenance'>,
  args: {
    projectId: string;
    processId: string;
  },
): Promise<SourceProvenanceEntry[]> {
  try {
    const response = await sourceProvenanceService.listProcessSourceProvenance(args);
    return response.entries;
  } catch {
    return [];
  }
}

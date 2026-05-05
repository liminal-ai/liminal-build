import {
  type ListProcessSourceProvenanceResponse,
  listProcessSourceProvenanceResponseSchema,
  type SourceAttachmentSummary,
  type SourceProvenanceEntry,
} from '../../../shared/contracts/index.js';
import {
  buildSourceAttachmentShadowKey,
  resolveActiveProcessSourceAttachments,
  resolveCanonicalProcessSourceAttachment,
} from '../processes/active-process-sources.js';
import type { CodeCheckpointTarget } from '../processes/environment/checkpoint-types.js';
import type { PlatformStore, StoredSourceProvenanceRecord } from '../projects/platform-store.js';
import type { SourceRefreshService } from './source-refresh.service.js';

type SourceProvenancePlatformStore = PlatformStore & {
  createSourceProvenance: NonNullable<PlatformStore['createSourceProvenance']>;
  getCurrentProcessMaterialRefs: NonNullable<PlatformStore['getCurrentProcessMaterialRefs']>;
  listProcessSourceProvenance: NonNullable<PlatformStore['listProcessSourceProvenance']>;
};

export interface SourceProvenanceService {
  recordInformedWorkForCurrentSources(args: {
    projectId: string;
    processId: string;
    usedSourceAttachmentIds: string[];
    eventId?: string | null;
  }): Promise<void>;
  recordReceivedCodeUpdates(args: {
    projectId: string;
    processId: string;
    codeTargets: CodeCheckpointTarget[];
    eventId?: string | null;
  }): Promise<void>;
  listProcessSourceProvenance(args: {
    projectId: string;
    processId: string;
  }): Promise<ListProcessSourceProvenanceResponse>;
}

export class DefaultSourceProvenanceService implements SourceProvenanceService {
  constructor(
    private readonly platformStore: SourceProvenancePlatformStore,
    private readonly sourceRefreshService?: Pick<
      SourceRefreshService,
      'synchronizeProjectSourceAttachments'
    >,
  ) {}

  async recordInformedWorkForCurrentSources(args: {
    projectId: string;
    processId: string;
    usedSourceAttachmentIds: string[];
    eventId?: string | null;
  }): Promise<void> {
    if (args.usedSourceAttachmentIds.length === 0) {
      return;
    }

    const [currentMaterialRefs, projectSourceAttachments] = await Promise.all([
      this.platformStore.getCurrentProcessMaterialRefs({
        processId: args.processId,
      }),
      this.platformStore.listProjectSourceAttachments({
        projectId: args.projectId,
      }),
    ]);
    const rawSourceAttachmentsById = new Map(
      projectSourceAttachments.map((sourceAttachment) => [
        sourceAttachment.sourceAttachmentId,
        sourceAttachment,
      ]),
    );
    const usedSourceAttachmentIds = new Set(args.usedSourceAttachmentIds);
    const usedShadowKeys = new Set(
      args.usedSourceAttachmentIds
        .map((sourceAttachmentId) => rawSourceAttachmentsById.get(sourceAttachmentId))
        .filter((sourceAttachment): sourceAttachment is SourceAttachmentSummary => {
          return sourceAttachment !== undefined;
        })
        .map((sourceAttachment) => buildSourceAttachmentShadowKey(sourceAttachment)),
    );
    const activeSourceAttachments = resolveActiveProcessSourceAttachments({
      sourceAttachments: projectSourceAttachments,
      processId: args.processId,
      currentSourceAttachmentIds: currentMaterialRefs.sourceAttachmentIds,
    }).filter(
      (sourceAttachment) =>
        usedSourceAttachmentIds.has(sourceAttachment.sourceAttachmentId) ||
        usedShadowKeys.has(buildSourceAttachmentShadowKey(sourceAttachment)),
    );

    await Promise.all(
      activeSourceAttachments.map((sourceAttachment) =>
        this.createProvenanceRecord({
          projectId: args.projectId,
          processId: args.processId,
          sourceAttachment,
          relationshipKind: 'informed_work',
          eventId: args.eventId ?? null,
        }),
      ),
    );
  }

  async recordReceivedCodeUpdates(args: {
    projectId: string;
    processId: string;
    codeTargets: CodeCheckpointTarget[];
    eventId?: string | null;
  }): Promise<void> {
    if (args.codeTargets.length === 0) {
      return;
    }

    const projectSourceAttachments = await this.platformStore.listProjectSourceAttachments({
      projectId: args.projectId,
    });
    const sourceAttachmentsById = new Map(
      projectSourceAttachments.map((sourceAttachment) => [
        sourceAttachment.sourceAttachmentId,
        sourceAttachment,
      ]),
    );

    await Promise.all(
      Array.from(new Set(args.codeTargets.map((target) => target.sourceAttachmentId))).map(
        async (sourceAttachmentId) => {
          const sourceAttachment = sourceAttachmentsById.get(sourceAttachmentId);

          if (
            sourceAttachment === undefined ||
            sourceAttachment.detachedAt != null ||
            sourceAttachment.accessMode !== 'read_write'
          ) {
            return;
          }

          await this.createProvenanceRecord({
            projectId: args.projectId,
            processId: args.processId,
            sourceAttachment,
            relationshipKind: 'received_code_update',
            eventId: args.eventId ?? null,
          });
        },
      ),
    );
  }

  async listProcessSourceProvenance(args: {
    projectId: string;
    processId: string;
  }): Promise<ListProcessSourceProvenanceResponse> {
    const [records, currentMaterialRefs, rawProjectSourceAttachments] = await Promise.all([
      this.platformStore.listProcessSourceProvenance({
        processId: args.processId,
      }),
      this.platformStore.getCurrentProcessMaterialRefs({
        processId: args.processId,
      }),
      this.platformStore.listProjectSourceAttachments({
        projectId: args.projectId,
      }),
    ]);
    const projectSourceAttachments =
      this.sourceRefreshService === undefined
        ? rawProjectSourceAttachments
        : await this.sourceRefreshService.synchronizeProjectSourceAttachments({
            projectId: args.projectId,
            sourceAttachments: rawProjectSourceAttachments,
          });
    const sourceAttachmentsById = new Map(
      projectSourceAttachments.map((sourceAttachment) => [
        sourceAttachment.sourceAttachmentId,
        sourceAttachment,
      ]),
    );

    return listProcessSourceProvenanceResponseSchema.parse({
      entries: records.map((record) =>
        this.buildSourceProvenanceEntry(record, {
          currentAttachment:
            resolveCanonicalProcessSourceAttachment({
              sourceAttachments: projectSourceAttachments,
              processId: args.processId,
              currentSourceAttachmentIds: currentMaterialRefs.sourceAttachmentIds,
              repositoryFullName: record.repositoryFullName,
              targetRef: record.targetRef,
            }) ?? null,
          exactAttachment:
            record.sourceAttachmentId === null
              ? null
              : (sourceAttachmentsById.get(record.sourceAttachmentId) ?? null),
        }),
      ),
    });
  }

  private async createProvenanceRecord(args: {
    projectId: string;
    processId: string;
    sourceAttachment: SourceAttachmentSummary;
    relationshipKind: SourceProvenanceEntry['relationshipKind'];
    eventId: string | null;
  }): Promise<void> {
    await this.platformStore.createSourceProvenance({
      projectId: args.projectId,
      processId: args.processId,
      sourceAttachmentId: args.sourceAttachment.sourceAttachmentId,
      relationshipKind: args.relationshipKind,
      repositoryFullName: args.sourceAttachment.repositoryFullName,
      repositoryUrl: args.sourceAttachment.repositoryUrl,
      targetRef: args.sourceAttachment.targetRef,
      eventId: args.eventId,
      entryStatus: 'ready',
      degradationReason: null,
    });
  }

  private buildSourceProvenanceEntry(
    record: StoredSourceProvenanceRecord,
    args: {
      currentAttachment: SourceAttachmentSummary | null;
      exactAttachment: SourceAttachmentSummary | null;
    },
  ): SourceProvenanceEntry {
    const sourceAttachment = args.currentAttachment;
    if (
      record.entryStatus === 'ready' &&
      record.degradationReason === null &&
      sourceAttachment !== null &&
      (args.exactAttachment === null || args.exactAttachment.detachedAt == null) &&
      sourceAttachment.detachedAt == null &&
      !isRedactedCurrentAttachment(sourceAttachment) &&
      sourceAttachment.hydrationState !== 'unavailable'
    ) {
      return {
        provenanceId: record.provenanceId,
        sourceAttachmentId: record.sourceAttachmentId,
        relationshipKind: record.relationshipKind,
        repositoryFullName: record.repositoryFullName,
        repositoryUrl: record.repositoryUrl,
        targetRef: record.targetRef,
        currentAttachmentDisplayName: sourceAttachment.displayName,
        currentAttachmentScope: sourceAttachment.attachmentScope,
        currentAttachmentAccessMode: sourceAttachment.accessMode,
        currentAttachmentHydrationState: sourceAttachment.hydrationState,
        currentAttachmentVisibility: 'available',
        entryStatus: record.entryStatus,
        degradationReason: record.degradationReason,
        recordedAt: record.recordedAt,
      };
    }

    const currentAttachmentVisibility =
      args.exactAttachment?.detachedAt != null || record.degradationReason === 'source_detached'
        ? 'detached'
        : record.degradationReason === 'access_revoked' ||
            (sourceAttachment !== null && isRedactedCurrentAttachment(sourceAttachment))
          ? 'redacted'
          : 'unavailable';

    return {
      provenanceId: record.provenanceId,
      sourceAttachmentId: record.sourceAttachmentId,
      relationshipKind: record.relationshipKind,
      repositoryFullName: record.repositoryFullName,
      repositoryUrl: record.repositoryUrl,
      targetRef: record.targetRef,
      currentAttachmentDisplayName: null,
      currentAttachmentScope: null,
      currentAttachmentAccessMode: null,
      currentAttachmentHydrationState: null,
      currentAttachmentVisibility,
      entryStatus: 'degraded',
      degradationReason:
        record.degradationReason ??
        (currentAttachmentVisibility === 'detached'
          ? 'source_detached'
          : currentAttachmentVisibility === 'redacted'
            ? 'access_revoked'
            : 'current_attachment_unavailable'),
      recordedAt: record.recordedAt,
    };
  }
}

function isRedactedCurrentAttachment(sourceAttachment: SourceAttachmentSummary): boolean {
  return (
    sourceAttachment.hydrationState === 'unavailable' &&
    (sourceAttachment.freshnessReason === 'repository_unavailable' ||
      sourceAttachment.freshnessReason === 'access_revoked')
  );
}

import {
  type SourceAttachmentSectionEnvelope,
  sourceAttachmentSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type { AuthenticatedActor } from '../../auth/auth-session.service.js';
import type { PlatformStore } from '../platform-store.js';
import { buildSourceAttachmentSummary } from '../summary/source-summary.builder.js';
import type { SourceRefreshService } from '../../sources/source-refresh.service.js';

export class SourceSectionReader {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly sourceRefreshService?: SourceRefreshService,
  ) {}

  async read(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<SourceAttachmentSectionEnvelope> {
    void args.actor;
    const [sourceAttachments, projectProcesses] = await Promise.all([
      this.platformStore.listProjectSourceAttachments({
        projectId: args.projectId,
      }),
      this.platformStore.listProjectProcesses({
        projectId: args.projectId,
      }),
    ]);
    const synchronizedSourceAttachments =
      this.sourceRefreshService === undefined
        ? sourceAttachments
        : await this.sourceRefreshService.synchronizeProjectSourceAttachments({
            projectId: args.projectId,
            sourceAttachments,
          });
    const refreshTargetCountsBySourceAttachmentId = new Map<string, number>();

    for (const process of projectProcesses) {
      const materialRefs = await this.platformStore.getCurrentProcessMaterialRefs({
        processId: process.processId,
      });

      for (const sourceAttachmentId of materialRefs.sourceAttachmentIds) {
        refreshTargetCountsBySourceAttachmentId.set(
          sourceAttachmentId,
          (refreshTargetCountsBySourceAttachmentId.get(sourceAttachmentId) ?? 0) + 1,
        );
      }
    }

    const items = [...synchronizedSourceAttachments]
      .filter((sourceAttachment) => sourceAttachment.detachedAt == null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((sourceAttachment) =>
        buildSourceAttachmentSummary({
          ...sourceAttachment,
          ...(sourceAttachment.attachmentScope === 'project'
            ? {
                projectRefreshTargetCount:
                  refreshTargetCountsBySourceAttachmentId.get(
                    sourceAttachment.sourceAttachmentId,
                  ) ?? 0,
              }
            : {}),
        }),
      );

    return sourceAttachmentSectionEnvelopeSchema.parse({
      status: items.length > 0 ? 'ready' : 'empty',
      items,
    });
  }
}

import {
  type SourceAttachmentSectionEnvelope,
  sourceAttachmentSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type { AuthenticatedActor } from '../../auth/auth-session.service.js';
import type { PlatformStore } from '../platform-store.js';
import { buildSourceAttachmentSummary } from '../summary/source-summary.builder.js';

export class SourceSectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<SourceAttachmentSectionEnvelope> {
    void args.actor;
    const sourceAttachments = await this.platformStore.listProjectSourceAttachments({
      projectId: args.projectId,
    });
    const items = [...sourceAttachments]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((sourceAttachment) => buildSourceAttachmentSummary(sourceAttachment));

    return sourceAttachmentSectionEnvelopeSchema.parse({
      status: items.length > 0 ? 'ready' : 'empty',
      items,
    });
  }
}

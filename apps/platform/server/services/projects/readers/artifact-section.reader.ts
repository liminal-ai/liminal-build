import {
  type ArtifactSectionEnvelope,
  artifactSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type { AuthenticatedActor } from '../../auth/auth-session.service.js';
import type { PlatformStore } from '../platform-store.js';
import { buildArtifactSummary } from '../summary/artifact-summary.builder.js';

export class ArtifactSectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<ArtifactSectionEnvelope> {
    void args.actor;
    const artifacts = await this.platformStore.listProjectArtifacts({
      projectId: args.projectId,
    });
    const items = [...artifacts]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((artifact) => buildArtifactSummary(artifact));

    return artifactSectionEnvelopeSchema.parse({
      status: items.length > 0 ? 'ready' : 'empty',
      items,
    });
  }
}

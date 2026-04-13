import {
  type ProcessSectionEnvelope,
  processSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type { AuthenticatedActor } from '../../auth/auth-session.service.js';
import type { PlatformStore } from '../platform-store.js';
import { buildProcessSummary } from '../summary/process-summary.builder.js';

export class ProcessSectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<ProcessSectionEnvelope> {
    void args.actor;
    const processes = await this.platformStore.listProjectProcesses({
      projectId: args.projectId,
    });
    const items = [...processes]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((process) => buildProcessSummary(process));

    return processSectionEnvelopeSchema.parse({
      status: items.length > 0 ? 'ready' : 'empty',
      items,
    });
  }
}

import {
  type SideWorkSectionEnvelope,
  sideWorkSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type { PlatformStore } from '../../projects/platform-store.js';

export class SideWorkSectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: { processId: string }): Promise<SideWorkSectionEnvelope> {
    const items = await this.platformStore.listProcessSideWorkItems({
      processId: args.processId,
    });

    return sideWorkSectionEnvelopeSchema.parse({
      status: items.length > 0 ? 'ready' : 'empty',
      items,
    });
  }
}

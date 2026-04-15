import {
  type ProcessHistorySectionEnvelope,
  processHistorySectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type { PlatformStore } from '../../projects/platform-store.js';

export class HistorySectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: { processId: string }): Promise<ProcessHistorySectionEnvelope> {
    const items = await this.platformStore.listProcessHistoryItems({
      processId: args.processId,
    });
    const sortedItems = [...items].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );

    return processHistorySectionEnvelopeSchema.parse({
      status: sortedItems.length > 0 ? 'ready' : 'empty',
      items: sortedItems,
    });
  }
}

import {
  type SideWorkItem,
  type SideWorkSectionEnvelope,
  sideWorkSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type { PlatformStore } from '../../projects/platform-store.js';

function sortCurrentSideWork(items: SideWorkItem[]): SideWorkItem[] {
  const runningItems = items
    .filter((item) => item.status === 'running')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const settledItems = items
    .filter((item) => item.status !== 'running')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return [...runningItems, ...settledItems];
}

export class SideWorkSectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: { processId: string }): Promise<SideWorkSectionEnvelope> {
    const items = sortCurrentSideWork(
      await this.platformStore.listProcessSideWorkItems({
        processId: args.processId,
      }),
    );

    return sideWorkSectionEnvelopeSchema.parse({
      status: items.length > 0 ? 'ready' : 'empty',
      items,
    });
  }
}

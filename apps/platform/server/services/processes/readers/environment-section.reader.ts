import type { EnvironmentSummary } from '../../../../shared/contracts/index.js';
import type { PlatformStore } from '../../projects/platform-store.js';

export class EnvironmentSectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: { processId: string }): Promise<EnvironmentSummary> {
    return this.platformStore.getProcessEnvironmentSummary({
      processId: args.processId,
    });
  }
}

import type { SupportedProcessType } from '../../../shared/contracts/index.js';
import type { PlatformStore } from './platform-store.js';

const displayLabelPrefixByType: Record<SupportedProcessType, string> = {
  ProductDefinition: 'Product Definition',
  FeatureSpecification: 'Feature Specification',
  FeatureImplementation: 'Feature Implementation',
};

export class ProcessDisplayLabelService {
  constructor(private readonly platformStore: PlatformStore) {}

  async nextLabel(args: { projectId: string; processType: SupportedProcessType }): Promise<string> {
    const processes = await this.platformStore.listProjectProcesses({
      projectId: args.projectId,
    });
    const matchingCount = processes.filter(
      (process) => process.processType === args.processType,
    ).length;

    return `${displayLabelPrefixByType[args.processType]} #${matchingCount + 1}`;
  }
}

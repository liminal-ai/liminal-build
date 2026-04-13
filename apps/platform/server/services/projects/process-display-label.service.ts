import type { SupportedProcessType } from '../../../shared/contracts/index.js';

const displayLabelPrefixByType: Record<SupportedProcessType, string> = {
  ProductDefinition: 'Product Definition',
  FeatureSpecification: 'Feature Specification',
  FeatureImplementation: 'Feature Implementation',
};

export class ProcessDisplayLabelService {
  async nextLabel(args: { projectId: string; processType: SupportedProcessType }): Promise<string> {
    void args.projectId;
    return `${displayLabelPrefixByType[args.processType]} #1`;
  }
}

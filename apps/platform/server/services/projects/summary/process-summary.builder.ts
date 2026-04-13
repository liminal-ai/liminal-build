import { type ProcessSummary, processSummarySchema } from '../../../../shared/contracts/index.js';

export function buildProcessSummary(input: ProcessSummary): ProcessSummary {
  return processSummarySchema.parse(input);
}

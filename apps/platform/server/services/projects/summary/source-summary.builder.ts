import {
  type SourceAttachmentSummary,
  sourceAttachmentSummarySchema,
} from '../../../../shared/contracts/index.js';

export function buildSourceAttachmentSummary(
  input: SourceAttachmentSummary,
): SourceAttachmentSummary {
  return sourceAttachmentSummarySchema.parse(input);
}

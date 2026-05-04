import {
  type SourceAttachmentSummary,
  sourceAttachmentSummarySchema,
} from '../../../../shared/contracts/index.js';
import { buildSourceAttachmentReadSummary } from '../../sources/source-read-models.js';

export function buildSourceAttachmentSummary(
  input: SourceAttachmentSummary,
): SourceAttachmentSummary {
  return sourceAttachmentSummarySchema.parse(buildSourceAttachmentReadSummary(input));
}

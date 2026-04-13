import {
  type SourceAttachmentSectionEnvelope,
  sourceAttachmentSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';

export class SourceSectionReader {
  async read(): Promise<SourceAttachmentSectionEnvelope> {
    return sourceAttachmentSectionEnvelopeSchema.parse({
      status: 'empty',
      items: [],
    });
  }
}

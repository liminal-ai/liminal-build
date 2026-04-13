import {
  type ProcessSectionEnvelope,
  processSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';

export class ProcessSectionReader {
  async read(): Promise<ProcessSectionEnvelope> {
    return processSectionEnvelopeSchema.parse({
      status: 'empty',
      items: [],
    });
  }
}

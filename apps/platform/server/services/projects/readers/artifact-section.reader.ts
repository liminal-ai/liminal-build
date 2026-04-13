import {
  type ArtifactSectionEnvelope,
  artifactSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';

export class ArtifactSectionReader {
  async read(): Promise<ArtifactSectionEnvelope> {
    return artifactSectionEnvelopeSchema.parse({
      status: 'empty',
      items: [],
    });
  }
}

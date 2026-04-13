import { type ArtifactSummary, artifactSummarySchema } from '../../../../shared/contracts/index.js';

export function buildArtifactSummary(input: ArtifactSummary): ArtifactSummary {
  return artifactSummarySchema.parse(input);
}

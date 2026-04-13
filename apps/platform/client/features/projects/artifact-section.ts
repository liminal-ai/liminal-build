import type { ArtifactSectionEnvelope } from '../../../shared/contracts/index.js';
import { renderSectionEnvelopeState } from './section-envelope.js';

export function renderArtifactSection(args: {
  envelope: ArtifactSectionEnvelope | null;
  targetDocument: Document;
}): HTMLElement {
  return renderSectionEnvelopeState({
    title: 'Artifacts',
    envelope: args.envelope,
    targetDocument: args.targetDocument,
  });
}

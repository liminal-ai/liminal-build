import type { SourceAttachmentSectionEnvelope } from '../../../shared/contracts/index.js';
import { renderSectionEnvelopeState } from './section-envelope.js';

export function renderSourceAttachmentSection(args: {
  envelope: SourceAttachmentSectionEnvelope | null;
  targetDocument: Document;
}): HTMLElement {
  return renderSectionEnvelopeState({
    title: 'Source attachments',
    envelope: args.envelope,
    targetDocument: args.targetDocument,
  });
}

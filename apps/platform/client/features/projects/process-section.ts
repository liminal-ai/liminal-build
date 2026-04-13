import type { ProcessSectionEnvelope } from '../../../shared/contracts/index.js';
import { renderSectionEnvelopeState } from './section-envelope.js';

export function renderProcessSection(args: {
  envelope: ProcessSectionEnvelope | null;
  selectedProcessId: string | null;
  targetDocument: Document;
}): HTMLElement {
  const section = renderSectionEnvelopeState({
    title: 'Processes',
    envelope: args.envelope,
    targetDocument: args.targetDocument,
  });

  if (args.selectedProcessId !== null) {
    const focused = args.targetDocument.createElement('p');
    focused.textContent = `Focused process scaffold: ${args.selectedProcessId}`;
    section.append(focused);
  }

  return section;
}

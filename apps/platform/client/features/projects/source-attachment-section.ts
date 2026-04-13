import type { SourceAttachmentSectionEnvelope } from '../../../shared/contracts/index.js';
import {
  appendSectionMessage,
  createSectionElement,
  renderSectionEnvelopeState,
} from './section-envelope.js';

function formatHydrationStateLabel(hydrationState: string): string {
  return hydrationState.replaceAll('_', ' ');
}

export function renderSourceAttachmentSection(args: {
  envelope: SourceAttachmentSectionEnvelope | null;
  targetDocument: Document;
}): HTMLElement {
  if (args.envelope === null || args.envelope.status !== 'ready') {
    return renderSectionEnvelopeState({
      title: 'Source attachments',
      envelope: args.envelope,
      targetDocument: args.targetDocument,
    });
  }

  const section = createSectionElement({
    title: 'Source attachments',
    targetDocument: args.targetDocument,
  });
  const list = args.targetDocument.createElement('ul');

  if (args.envelope.items.length === 0) {
    return appendSectionMessage({
      section,
      message: 'No source attachments yet.',
      targetDocument: args.targetDocument,
    });
  }

  for (const sourceAttachment of args.envelope.items) {
    const item = args.targetDocument.createElement('li');
    const heading = args.targetDocument.createElement('strong');
    const purpose = args.targetDocument.createElement('p');
    const hydration = args.targetDocument.createElement('p');
    const scope = args.targetDocument.createElement('p');
    const updatedAt = args.targetDocument.createElement('p');

    heading.textContent = sourceAttachment.displayName;
    purpose.textContent = `Purpose: ${sourceAttachment.purpose}`;
    hydration.textContent = `Hydration: ${formatHydrationStateLabel(sourceAttachment.hydrationState)}`;
    scope.textContent =
      sourceAttachment.attachmentScope === 'project'
        ? 'Project-scoped source attachment.'
        : `Attached to ${sourceAttachment.processDisplayLabel ?? sourceAttachment.processId ?? 'a process'}.`;
    updatedAt.textContent = `Updated: ${sourceAttachment.updatedAt}`;

    item.append(heading, purpose, hydration, scope, updatedAt);

    if (sourceAttachment.targetRef !== null) {
      const targetRef = args.targetDocument.createElement('p');
      targetRef.textContent = `Target ref: ${sourceAttachment.targetRef}`;
      item.append(targetRef);
    }

    list.append(item);
  }

  section.append(list);
  return section;
}

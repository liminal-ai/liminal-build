import type { ArtifactSectionEnvelope } from '../../../shared/contracts/index.js';
import {
  appendSectionMessage,
  createSectionElement,
  renderSectionEnvelopeState,
} from './section-envelope.js';

export function renderArtifactSection(args: {
  envelope: ArtifactSectionEnvelope | null;
  targetDocument: Document;
}): HTMLElement {
  if (args.envelope === null || args.envelope.status !== 'ready') {
    return renderSectionEnvelopeState({
      title: 'Artifacts',
      envelope: args.envelope,
      targetDocument: args.targetDocument,
    });
  }

  const section = createSectionElement({
    title: 'Artifacts',
    targetDocument: args.targetDocument,
  });
  const list = args.targetDocument.createElement('ul');

  if (args.envelope.items.length === 0) {
    return appendSectionMessage({
      section,
      message: 'No artifacts yet.',
      targetDocument: args.targetDocument,
    });
  }

  for (const artifact of args.envelope.items) {
    const item = args.targetDocument.createElement('li');
    const heading = args.targetDocument.createElement('strong');
    const revision = args.targetDocument.createElement('p');
    const scope = args.targetDocument.createElement('p');
    const updatedAt = args.targetDocument.createElement('p');

    heading.textContent = artifact.displayName;
    revision.textContent =
      artifact.currentVersionLabel === null
        ? 'No current version available.'
        : `Current version: ${artifact.currentVersionLabel}`;
    scope.textContent =
      artifact.attachmentScope === 'project'
        ? 'Project-scoped artifact.'
        : `Attached to ${artifact.processDisplayLabel ?? artifact.processId ?? 'a process'}.`;
    updatedAt.textContent = `Updated: ${artifact.updatedAt}`;

    item.append(heading, revision, scope, updatedAt);
    list.append(item);
  }

  section.append(list);
  return section;
}

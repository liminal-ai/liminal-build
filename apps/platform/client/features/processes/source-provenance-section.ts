import type { ProcessSourceProvenanceSectionState } from '../../../shared/contracts/index.js';
import { appendSectionMessage, createSectionElement } from '../projects/section-envelope.js';

function appendDetail(args: {
  item: HTMLElement;
  label: string;
  value: string;
  targetDocument: Document;
}): void {
  const detail = args.targetDocument.createElement('p');
  detail.textContent = `${args.label}: ${args.value}`;
  args.item.append(detail);
}

function formatRelationshipLabel(relationshipKind: string): string {
  return relationshipKind.replaceAll('_', ' ');
}

export function renderSourceProvenanceSection(args: {
  provenance: ProcessSourceProvenanceSectionState | null;
  targetDocument: Document;
}): HTMLElement {
  const section = createSectionElement({
    title: 'Source provenance',
    targetDocument: args.targetDocument,
  });
  section.setAttribute('data-source-provenance-section', 'true');

  if (args.provenance === null) {
    return appendSectionMessage({
      section,
      message: 'Loading source provenance...',
      targetDocument: args.targetDocument,
    });
  }

  if (args.provenance.status === 'error') {
    return appendSectionMessage({
      section,
      message: args.provenance.error?.message ?? 'Source provenance is unavailable right now.',
      targetDocument: args.targetDocument,
    });
  }

  if (args.provenance.status === 'empty') {
    return appendSectionMessage({
      section,
      message: 'No source provenance has been recorded for this process yet.',
      targetDocument: args.targetDocument,
    });
  }

  const list = args.targetDocument.createElement('ul');

  for (const entry of args.provenance.entries) {
    const item = args.targetDocument.createElement('li');
    const heading = args.targetDocument.createElement('strong');

    item.setAttribute('data-source-provenance-entry', entry.provenanceId);
    item.setAttribute('data-source-provenance-status', entry.entryStatus);
    item.setAttribute('data-source-provenance-visibility', entry.currentAttachmentVisibility);
    heading.textContent = entry.repositoryFullName;

    item.append(heading);
    appendDetail({
      item,
      label: 'Relationship',
      value: formatRelationshipLabel(entry.relationshipKind),
      targetDocument: args.targetDocument,
    });
    appendDetail({
      item,
      label: 'Target ref',
      value: entry.targetRef ?? 'not set',
      targetDocument: args.targetDocument,
    });
    appendDetail({
      item,
      label: 'Current visibility',
      value: entry.currentAttachmentVisibility.replaceAll('_', ' '),
      targetDocument: args.targetDocument,
    });

    if (entry.currentAttachmentDisplayName !== null) {
      appendDetail({
        item,
        label: 'Current attachment',
        value: entry.currentAttachmentDisplayName,
        targetDocument: args.targetDocument,
      });
    }

    if (entry.degradationReason !== null) {
      appendDetail({
        item,
        label: 'Degraded because',
        value: entry.degradationReason.replaceAll('_', ' '),
        targetDocument: args.targetDocument,
      });
    }

    appendDetail({
      item,
      label: 'Recorded',
      value: entry.recordedAt,
      targetDocument: args.targetDocument,
    });
    list.append(item);
  }

  section.append(list);
  return section;
}

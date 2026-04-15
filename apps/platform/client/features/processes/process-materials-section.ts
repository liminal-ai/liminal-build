import type { ProcessMaterialsSectionEnvelope } from '../../../shared/contracts/index.js';
import { appendSectionMessage, createSectionElement } from '../projects/section-envelope.js';

function appendSubsection(args: {
  section: HTMLElement;
  heading: string;
  items: HTMLElement[];
  emptyMessage: string;
  targetDocument: Document;
}): void {
  const heading = args.targetDocument.createElement('h3');
  heading.textContent = args.heading;
  args.section.append(heading);

  if (args.items.length === 0) {
    const empty = args.targetDocument.createElement('p');
    empty.textContent = args.emptyMessage;
    args.section.append(empty);
    return;
  }

  const list = args.targetDocument.createElement('ul');

  for (const item of args.items) {
    list.append(item);
  }

  args.section.append(list);
}

function formatHydrationStateLabel(hydrationState: string): string {
  return hydrationState.replaceAll('_', ' ');
}

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

export function renderProcessMaterialsSection(args: {
  envelope: ProcessMaterialsSectionEnvelope | null;
  targetDocument: Document;
}): HTMLElement {
  const section = createSectionElement({
    title: 'Current materials',
    targetDocument: args.targetDocument,
  });
  section.setAttribute('data-process-materials-section', 'true');

  if (args.envelope === null) {
    return appendSectionMessage({
      section,
      message: 'Loading current materials...',
      targetDocument: args.targetDocument,
    });
  }

  if (args.envelope.status === 'empty') {
    return appendSectionMessage({
      section,
      message: 'No current materials apply right now.',
      targetDocument: args.targetDocument,
    });
  }

  if (args.envelope.status === 'error') {
    return appendSectionMessage({
      section,
      message: args.envelope.error?.message ?? 'Current materials failed to load.',
      targetDocument: args.targetDocument,
    });
  }

  if (
    args.envelope.currentArtifacts.length === 0 &&
    args.envelope.currentOutputs.length === 0 &&
    args.envelope.currentSources.length === 0
  ) {
    return appendSectionMessage({
      section,
      message: 'No current materials apply right now.',
      targetDocument: args.targetDocument,
    });
  }

  appendSubsection({
    section,
    heading: 'Artifacts',
    items: args.envelope.currentArtifacts.map((artifact) => {
      const item = args.targetDocument.createElement('li');
      const heading = args.targetDocument.createElement('strong');

      item.setAttribute('data-process-material-kind', 'artifact');
      item.setAttribute('data-process-material-id', artifact.artifactId);
      heading.textContent = artifact.displayName;

      item.append(heading);
      appendDetail({
        item,
        label: 'Artifact ID',
        value: artifact.artifactId,
        targetDocument: args.targetDocument,
      });

      if (artifact.currentVersionLabel === null) {
        appendDetail({
          item,
          label: 'Revision',
          value: 'No current version available',
          targetDocument: args.targetDocument,
        });
      } else {
        appendDetail({
          item,
          label: 'Current version',
          value: artifact.currentVersionLabel,
          targetDocument: args.targetDocument,
        });
      }

      if (artifact.roleLabel !== null) {
        appendDetail({
          item,
          label: 'Role',
          value: artifact.roleLabel,
          targetDocument: args.targetDocument,
        });
      }

      appendDetail({
        item,
        label: 'Updated',
        value: artifact.updatedAt,
        targetDocument: args.targetDocument,
      });
      return item;
    }),
    emptyMessage: 'No current artifacts.',
    targetDocument: args.targetDocument,
  });

  appendSubsection({
    section,
    heading: 'Outputs',
    items: args.envelope.currentOutputs.map((output) => {
      const item = args.targetDocument.createElement('li');
      const heading = args.targetDocument.createElement('strong');

      item.setAttribute('data-process-material-kind', 'output');
      item.setAttribute('data-process-material-id', output.outputId);
      heading.textContent = output.displayName;

      item.append(heading);
      appendDetail({
        item,
        label: 'Output ID',
        value: output.outputId,
        targetDocument: args.targetDocument,
      });

      if (output.revisionLabel === null) {
        appendDetail({
          item,
          label: 'Revision',
          value: 'No current revision available',
          targetDocument: args.targetDocument,
        });
      } else {
        appendDetail({
          item,
          label: 'Current revision',
          value: output.revisionLabel,
          targetDocument: args.targetDocument,
        });
      }

      appendDetail({
        item,
        label: 'State',
        value: output.state,
        targetDocument: args.targetDocument,
      });
      appendDetail({
        item,
        label: 'Updated',
        value: output.updatedAt,
        targetDocument: args.targetDocument,
      });
      return item;
    }),
    emptyMessage: 'No current outputs.',
    targetDocument: args.targetDocument,
  });

  appendSubsection({
    section,
    heading: 'Sources',
    items: args.envelope.currentSources.map((source) => {
      const item = args.targetDocument.createElement('li');
      const heading = args.targetDocument.createElement('strong');

      item.setAttribute('data-process-material-kind', 'source');
      item.setAttribute('data-process-material-id', source.sourceAttachmentId);
      heading.textContent = source.displayName;

      item.append(heading);
      appendDetail({
        item,
        label: 'Source ID',
        value: source.sourceAttachmentId,
        targetDocument: args.targetDocument,
      });
      appendDetail({
        item,
        label: 'Purpose',
        value: source.purpose,
        targetDocument: args.targetDocument,
      });
      appendDetail({
        item,
        label: 'Hydration',
        value: formatHydrationStateLabel(source.hydrationState),
        targetDocument: args.targetDocument,
      });

      if (source.targetRef !== null) {
        appendDetail({
          item,
          label: 'Target ref',
          value: source.targetRef,
          targetDocument: args.targetDocument,
        });
      }

      appendDetail({
        item,
        label: 'Updated',
        value: source.updatedAt,
        targetDocument: args.targetDocument,
      });
      return item;
    }),
    emptyMessage: 'No current sources.',
    targetDocument: args.targetDocument,
  });

  return section;
}

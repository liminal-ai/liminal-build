import type { ProcessMaterialsSectionEnvelope } from '../../../shared/contracts/index.js';

function appendList(args: {
  section: HTMLElement;
  heading: string;
  items: string[];
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
    const entry = args.targetDocument.createElement('li');
    entry.textContent = item;
    list.append(entry);
  }

  args.section.append(list);
}

export function renderProcessMaterialsSection(args: {
  envelope: ProcessMaterialsSectionEnvelope | null;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  title.textContent = 'Current materials';
  section.setAttribute('data-process-materials-section', 'true');
  section.append(title);

  if (args.envelope === null) {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'Loading current materials...';
    section.append(message);
    return section;
  }

  if (args.envelope.status === 'empty') {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'No current materials yet.';
    section.append(message);
    return section;
  }

  if (args.envelope.status === 'error') {
    const message = args.targetDocument.createElement('p');
    message.textContent = args.envelope.error?.message ?? 'Current materials failed to load.';
    section.append(message);
    return section;
  }

  appendList({
    section,
    heading: 'Artifacts',
    items: args.envelope.currentArtifacts.map((artifact) =>
      artifact.currentVersionLabel === null
        ? artifact.displayName
        : `${artifact.displayName} (${artifact.currentVersionLabel})`,
    ),
    emptyMessage: 'No current artifacts.',
    targetDocument: args.targetDocument,
  });

  appendList({
    section,
    heading: 'Outputs',
    items: args.envelope.currentOutputs.map((output) =>
      output.revisionLabel === null
        ? `${output.displayName} (${output.state})`
        : `${output.displayName} (${output.revisionLabel}, ${output.state})`,
    ),
    emptyMessage: 'No current outputs.',
    targetDocument: args.targetDocument,
  });

  appendList({
    section,
    heading: 'Sources',
    items: args.envelope.currentSources.map((source) =>
      source.targetRef === null
        ? `${source.displayName} (${source.hydrationState})`
        : `${source.displayName} (${source.targetRef}, ${source.hydrationState})`,
    ),
    emptyMessage: 'No current sources.',
    targetDocument: args.targetDocument,
  });

  return section;
}

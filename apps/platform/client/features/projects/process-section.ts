import type { ProcessSectionEnvelope } from '../../../shared/contracts/index.js';
import {
  appendSectionMessage,
  createSectionElement,
  renderSectionEnvelopeState,
} from './section-envelope.js';

function formatProcessTypeLabel(processType: string): string {
  return processType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatProcessStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'running':
      return 'Running';
    case 'waiting':
      return 'Waiting';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'interrupted':
      return 'Interrupted';
    default:
      return status;
  }
}

export function renderProcessSection(args: {
  envelope: ProcessSectionEnvelope | null;
  selectedProcessId: string | null;
  targetDocument: Document;
}): HTMLElement {
  if (args.envelope === null || args.envelope.status !== 'ready') {
    return renderSectionEnvelopeState({
      title: 'Processes',
      envelope: args.envelope,
      targetDocument: args.targetDocument,
    });
  }

  const section = createSectionElement({
    title: 'Processes',
    targetDocument: args.targetDocument,
  });
  const list = args.targetDocument.createElement('ul');
  const processes = [...args.envelope.items].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

  if (processes.length === 0) {
    return appendSectionMessage({
      section,
      message: 'No processes yet.',
      targetDocument: args.targetDocument,
    });
  }

  for (const process of processes) {
    const item = args.targetDocument.createElement('li');
    const heading = args.targetDocument.createElement('strong');
    const meta = args.targetDocument.createElement('p');
    const phase = args.targetDocument.createElement('p');
    const updatedAt = args.targetDocument.createElement('p');

    heading.textContent = process.displayLabel;
    meta.textContent = `${formatProcessTypeLabel(process.processType)} • ${formatProcessStatusLabel(process.status)}`;
    phase.textContent = `Phase: ${process.phaseLabel}`;
    updatedAt.textContent = `Updated: ${process.updatedAt}`;

    item.append(heading, meta, phase, updatedAt);

    if (process.nextActionLabel !== null) {
      const nextAction = args.targetDocument.createElement('p');
      nextAction.textContent = `Next: ${process.nextActionLabel}`;
      item.append(nextAction);
    }

    if (process.availableActions.length > 0) {
      const actions = args.targetDocument.createElement('p');
      actions.textContent = `Available actions: ${process.availableActions.join(', ')}`;
      item.append(actions);
    }

    const environment = args.targetDocument.createElement('p');
    environment.textContent = process.hasEnvironment
      ? 'Environment assigned.'
      : 'No environment assigned.';
    item.append(environment);

    if (process.processId === args.selectedProcessId) {
      const selected = args.targetDocument.createElement('p');
      selected.textContent = 'Selected process';
      item.setAttribute('data-process-selected', 'true');
      item.append(selected);
    }

    list.append(item);
  }

  section.append(list);
  return section;
}

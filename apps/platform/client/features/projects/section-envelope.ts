import type {
  ArtifactSectionEnvelope,
  ProcessSectionEnvelope,
  SourceAttachmentSectionEnvelope,
} from '../../../shared/contracts/index.js';

type AnyEnvelope =
  | ProcessSectionEnvelope
  | ArtifactSectionEnvelope
  | SourceAttachmentSectionEnvelope
  | null;

export function renderSectionEnvelopeState(args: {
  title: string;
  envelope: AnyEnvelope;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  const body = args.targetDocument.createElement('p');

  title.textContent = args.title;
  section.append(title);

  if (args.envelope === null) {
    body.textContent = `${args.title} scaffolded; data loading starts in later stories.`;
    section.append(body);
    return section;
  }

  if (args.envelope.status === 'empty') {
    body.textContent = `${args.title} is currently empty.`;
    section.append(body);
    return section;
  }

  if (args.envelope.status === 'error') {
    body.textContent = args.envelope.error?.message ?? `${args.title} failed to load.`;
    section.append(body);
    return section;
  }

  body.textContent = `${args.title} ready with ${args.envelope.items.length} item(s).`;
  section.append(body);
  return section;
}

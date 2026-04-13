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

export function createSectionElement(args: {
  title: string;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  title.textContent = args.title;
  section.append(title);
  return section;
}

export function appendSectionMessage(args: {
  section: HTMLElement;
  message: string;
  targetDocument: Document;
}): HTMLElement {
  const body = args.targetDocument.createElement('p');
  body.textContent = args.message;
  args.section.append(body);
  return args.section;
}

export function renderSectionEnvelopeState(args: {
  title: string;
  envelope: AnyEnvelope;
  targetDocument: Document;
}): HTMLElement {
  const section = createSectionElement(args);

  if (args.envelope === null) {
    return appendSectionMessage({
      section,
      message: `${args.title} scaffolded; data loading starts in later stories.`,
      targetDocument: args.targetDocument,
    });
  }

  if (args.envelope.status === 'empty') {
    return appendSectionMessage({
      section,
      message: `${args.title} is currently empty.`,
      targetDocument: args.targetDocument,
    });
  }

  if (args.envelope.status === 'error') {
    return appendSectionMessage({
      section,
      message: args.envelope.error?.message ?? `${args.title} failed to load.`,
      targetDocument: args.targetDocument,
    });
  }

  return appendSectionMessage({
    section,
    message: `${args.title} ready with ${args.envelope.items.length} item(s).`,
    targetDocument: args.targetDocument,
  });
}

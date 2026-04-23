export function renderUnsupportedFallback(args: {
  targetDocument: Document;
  versionLabel: string;
  createdAt: string;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const message = args.targetDocument.createElement('p');
  const supportedKinds = args.targetDocument.createElement('p');

  container.setAttribute('data-unsupported-review-target', 'true');
  message.textContent = `Version ${args.versionLabel} from ${args.createdAt} is not reviewable in the current release.`;
  supportedKinds.textContent = 'Supported formats: markdown';
  container.append(message, supportedKinds);
  return container;
}

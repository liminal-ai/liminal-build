import type { ArtifactVersionSummary } from '../../../shared/contracts/index.js';

function createVersionButton(args: {
  targetDocument: Document;
  version: ArtifactVersionSummary;
  isSelected: boolean;
  onSelect: (versionId: string) => void;
}): HTMLButtonElement {
  const button = args.targetDocument.createElement('button');
  const labels = [args.version.versionLabel];

  if (args.version.isCurrent) {
    labels.push('Current');
  }

  if (args.isSelected) {
    labels.push('Selected');
  }

  button.type = 'button';
  button.textContent = labels.join(' - ');
  button.setAttribute('data-artifact-version-id', args.version.versionId);
  button.setAttribute('aria-pressed', args.isSelected ? 'true' : 'false');
  button.addEventListener('click', () => {
    args.onSelect(args.version.versionId);
  });

  return button;
}

export function renderVersionSwitcher(args: {
  versions: ArtifactVersionSummary[];
  selectedVersionId?: string;
  targetDocument: Document;
  onSelect: (versionId: string) => void;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const heading = args.targetDocument.createElement('h4');
  const list = args.targetDocument.createElement('div');

  container.setAttribute('data-artifact-version-switcher', 'true');
  heading.textContent = 'Versions';
  list.setAttribute('data-artifact-version-list', 'true');

  for (const version of args.versions) {
    const item = args.targetDocument.createElement('div');
    const meta = args.targetDocument.createElement('p');

    item.append(
      createVersionButton({
        targetDocument: args.targetDocument,
        version,
        isSelected: version.versionId === args.selectedVersionId,
        onSelect: args.onSelect,
      }),
    );
    meta.textContent = `Created: ${version.createdAt}`;
    item.append(meta);
    list.append(item);
  }

  container.append(heading, list);
  return container;
}

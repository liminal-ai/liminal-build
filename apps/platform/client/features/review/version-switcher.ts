import type { ArtifactVersionSummary } from '../../../shared/contracts/index.js';

function moveListboxSelection(args: {
  options: HTMLElement[];
  currentIndex: number;
  nextIndex: number;
}): void {
  const boundedIndex = Math.max(0, Math.min(args.nextIndex, args.options.length - 1));

  for (const [index, option] of args.options.entries()) {
    const isSelected = index === boundedIndex;
    option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    option.tabIndex = isSelected ? 0 : -1;
  }

  args.options[boundedIndex]?.focus();
}

function createVersionOption(args: {
  targetDocument: Document;
  version: ArtifactVersionSummary;
  isSelected: boolean;
  onSelect: (versionId: string) => void;
}): HTMLLIElement {
  const option = args.targetDocument.createElement('li');
  const labels = [args.version.versionLabel];

  if (args.version.isCurrent) {
    labels.push('Current');
  }

  if (args.isSelected) {
    labels.push('Selected');
  }

  option.textContent = labels.join(' - ');
  option.role = 'option';
  option.tabIndex = args.isSelected ? 0 : -1;
  option.setAttribute('data-artifact-version-id', args.version.versionId);
  option.setAttribute('aria-selected', args.isSelected ? 'true' : 'false');
  option.addEventListener('click', () => {
    args.onSelect(args.version.versionId);
  });
  option.addEventListener('keydown', (event) => {
    const options = [
      ...(option.parentElement?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
    ];
    const currentIndex = options.indexOf(option);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveListboxSelection({ options, currentIndex, nextIndex: currentIndex + 1 });
        return;
      case 'ArrowUp':
        event.preventDefault();
        moveListboxSelection({ options, currentIndex, nextIndex: currentIndex - 1 });
        return;
      case 'Home':
        event.preventDefault();
        moveListboxSelection({ options, currentIndex, nextIndex: 0 });
        return;
      case 'End':
        event.preventDefault();
        moveListboxSelection({
          options,
          currentIndex,
          nextIndex: options.length - 1,
        });
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        args.onSelect(args.version.versionId);
        return;
    }
  });

  return option;
}

export function renderVersionSwitcher(args: {
  versions: ArtifactVersionSummary[];
  selectedVersionId?: string;
  targetDocument: Document;
  onSelect: (versionId: string) => void;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const heading = args.targetDocument.createElement('h4');
  const list = args.targetDocument.createElement('ul');

  container.setAttribute('data-artifact-version-switcher', 'true');
  heading.textContent = 'Versions';
  list.role = 'listbox';
  list.setAttribute('aria-label', 'Artifact versions');
  list.setAttribute('data-artifact-version-list', 'true');

  for (const version of args.versions) {
    const item = createVersionOption({
      targetDocument: args.targetDocument,
      version,
      isSelected: version.versionId === args.selectedVersionId,
      onSelect: args.onSelect,
    });
    const meta = args.targetDocument.createElement('p');

    meta.textContent = `Created: ${version.createdAt}`;
    item.append(meta);
    list.append(item);
  }

  container.append(heading, list);
  return container;
}

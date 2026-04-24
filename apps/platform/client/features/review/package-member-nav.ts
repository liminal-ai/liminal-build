import type { PackageMember } from '../../../shared/contracts/index.js';

function moveListboxSelection(args: { options: HTMLElement[]; nextIndex: number }): void {
  const boundedIndex = Math.max(0, Math.min(args.nextIndex, args.options.length - 1));

  for (const [index, option] of args.options.entries()) {
    const isSelected = index === boundedIndex;
    option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    option.tabIndex = isSelected ? 0 : -1;
  }

  args.options[boundedIndex]?.focus();
}

function createStatusLabel(member: PackageMember): string {
  switch (member.status) {
    case 'ready':
      return 'Ready';
    case 'unsupported':
      return 'Unsupported';
    case 'unavailable':
      return 'Unavailable';
  }
}

export function renderPackageMemberNav(args: {
  members: PackageMember[];
  selectedMemberId?: string;
  targetDocument: Document;
  onSelect: (memberId: string) => void;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const heading = args.targetDocument.createElement('h4');
  const list = args.targetDocument.createElement('ul');

  container.setAttribute('data-package-member-nav', 'true');
  heading.textContent = 'Package members';
  list.role = 'listbox';
  list.setAttribute('aria-label', 'Package members');
  list.setAttribute('data-package-member-list', 'true');

  for (const member of args.members) {
    const item = args.targetDocument.createElement('li');
    const meta = args.targetDocument.createElement('p');
    const isSelected = member.memberId === args.selectedMemberId;
    const isDisabled = member.status !== 'ready';

    item.role = 'option';
    item.tabIndex = isSelected ? 0 : -1;
    item.textContent = `${member.position + 1}. ${member.displayName}`;
    item.setAttribute('data-package-member-id', member.memberId);
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    item.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    if (!isDisabled) {
      item.addEventListener('click', () => {
        args.onSelect(member.memberId);
      });
      item.addEventListener('keydown', (event) => {
        const options = [
          ...(item.parentElement?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
        ];
        const currentIndex = options.indexOf(item);

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            moveListboxSelection({ options, nextIndex: currentIndex + 1 });
            return;
          case 'ArrowUp':
            event.preventDefault();
            moveListboxSelection({ options, nextIndex: currentIndex - 1 });
            return;
          case 'Home':
            event.preventDefault();
            moveListboxSelection({ options, nextIndex: 0 });
            return;
          case 'End':
            event.preventDefault();
            moveListboxSelection({ options, nextIndex: options.length - 1 });
            return;
          case 'Enter':
          case ' ':
            event.preventDefault();
            args.onSelect(member.memberId);
            return;
        }
      });
    }

    meta.textContent = `${member.versionLabel} • ${createStatusLabel(member)}`;
    item.append(meta);
    list.append(item);
  }

  container.append(heading, list);
  return container;
}

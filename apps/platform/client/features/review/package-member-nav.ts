import type { PackageMember } from '../../../shared/contracts/index.js';

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
  const list = args.targetDocument.createElement('div');

  container.setAttribute('data-package-member-nav', 'true');
  heading.textContent = 'Package members';
  list.setAttribute('data-package-member-list', 'true');

  for (const member of args.members) {
    const item = args.targetDocument.createElement('div');
    const button = args.targetDocument.createElement('button');
    const meta = args.targetDocument.createElement('p');
    const isSelected = member.memberId === args.selectedMemberId;
    const isDisabled = member.status !== 'ready';

    button.type = 'button';
    button.textContent = `${member.position + 1}. ${member.displayName}`;
    button.setAttribute('data-package-member-id', member.memberId);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    button.disabled = isDisabled;

    if (!isDisabled) {
      button.addEventListener('click', () => {
        args.onSelect(member.memberId);
      });
    }

    meta.textContent = `${member.versionLabel} • ${createStatusLabel(member)}`;
    item.append(button, meta);
    list.append(item);
  }

  container.append(heading, list);
  return container;
}

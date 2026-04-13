import type { AppStore } from '../../app/store.js';

export function renderShellHeader(args: {
  store: AppStore;
  targetDocument: Document;
}): HTMLElement {
  const header = args.targetDocument.createElement('header');
  const title = args.targetDocument.createElement('h1');
  const signOutButton = args.targetDocument.createElement('button');
  const actor = args.store.get().auth.actor;

  title.textContent = actor?.displayName ?? 'Liminal Build Platform Shell';
  signOutButton.textContent = 'Sign out';
  signOutButton.disabled = true;
  signOutButton.title = 'Story 0 scaffold only';

  header.append(title, signOutButton);
  return header;
}

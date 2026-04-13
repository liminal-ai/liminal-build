import { signOut } from '../../browser-api/auth-api.js';
import type { AppStore } from '../../app/store.js';
import { defaultAppState } from '../../app/store.js';

export function renderShellHeader(args: {
  store: AppStore;
  targetDocument: Document;
  targetWindow: Window & typeof globalThis;
}): HTMLElement {
  const header = args.targetDocument.createElement('header');
  const title = args.targetDocument.createElement('h1');
  const signOutButton = args.targetDocument.createElement('button');
  const actor = args.store.get().auth.actor;

  title.textContent = actor?.displayName ?? 'Liminal Build Platform Shell';
  signOutButton.textContent = 'Sign out';
  signOutButton.disabled = actor === null;
  signOutButton.addEventListener('click', async () => {
    const csrfToken = args.store.get().auth.csrfToken;

    if (csrfToken === null) {
      return;
    }

    const { redirectUrl } = await signOut({ csrfToken });
    args.store.set({
      ...defaultAppState,
      auth: {
        actor: null,
        isResolved: true,
        csrfToken: null,
      },
      route: {
        pathname: '/projects',
        projectId: null,
        selectedProcessId: null,
      },
    });
    args.targetWindow.location.assign(redirectUrl);
  });

  header.append(title, signOutButton);
  return header;
}

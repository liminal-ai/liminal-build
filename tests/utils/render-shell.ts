import { JSDOM } from 'jsdom';
import { bootstrapApp } from '../../apps/platform/client/app/bootstrap.js';
import {
  type ShellBootstrapPayload,
  shellBootstrapPayloadSchema,
} from '../../apps/platform/shared/contracts/index.js';

export async function renderShell(overrides: Partial<ShellBootstrapPayload> = {}) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body><div id="app"></div></body></html>', {
    url: 'http://localhost:3000/projects',
  });

  const bootstrapPayload = shellBootstrapPayloadSchema.parse({
    actor: null,
    pathname: '/projects',
    search: '',
    csrfToken: 'story0-csrf-token',
    auth: {
      loginPath: '/auth/login',
      logoutPath: '/auth/logout',
    },
    ...overrides,
  });

  (dom.window as unknown as Window & typeof globalThis).__SHELL_BOOTSTRAP__ = bootstrapPayload;

  await bootstrapApp(dom.window as unknown as Window & typeof globalThis);

  const root = dom.window.document.getElementById('app');

  if (!(root instanceof dom.window.HTMLElement)) {
    throw new Error('Story 0 render helper expected an #app root element.');
  }

  return {
    bootstrapPayload,
    dom,
    root,
    window: dom.window,
  };
}

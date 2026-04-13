import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import { shellBootstrapPayloadSchema } from '../../../apps/platform/shared/contracts/index.js';
import { emptyProjectShellResponse } from '../../fixtures/projects.js';

function buildJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('create process modal', () => {
  it('TC-6.1b cancel process creation keeps the user in the same project shell without a write', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
      const pathname = url.startsWith('http') ? new URL(url).pathname : url;

      if (pathname === '/auth/me') {
        return buildJsonResponse({
          user: {
            id: 'user:workos-user-1',
            email: 'lee@example.com',
            displayName: 'Lee Moore',
          },
        });
      }

      if (pathname === `/api/projects/${emptyProjectShellResponse.project.projectId}`) {
        return buildJsonResponse(emptyProjectShellResponse);
      }

      throw new Error(`Unexpected fetch request in create-process-modal test: ${pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: `http://localhost:5001/projects/${emptyProjectShellResponse.project.projectId}`,
    });

    (dom.window as unknown as Window & typeof globalThis).__SHELL_BOOTSTRAP__ =
      shellBootstrapPayloadSchema.parse({
        actor: {
          id: 'user:workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        pathname: `/projects/${emptyProjectShellResponse.project.projectId}`,
        search: '',
        csrfToken: 'csrf-token',
        auth: {
          loginPath: '/auth/login',
          logoutPath: '/auth/logout',
        },
      });

    await bootstrapApp(dom.window as unknown as Window & typeof globalThis);
    await flush();
    const createProcessButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Create process',
    );

    if (!(createProcessButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected create-process button to be present in the shell.');
    }

    createProcessButton.click();
    await flush();

    expect(dom.window.document.body.textContent).toContain('ProductDefinition');
    expect(dom.window.document.body.textContent).toContain('FeatureSpecification');
    expect(dom.window.document.body.textContent).toContain('FeatureImplementation');

    const cancelButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Cancel',
    );

    if (!(cancelButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected create-process modal cancel button to be present.');
    }

    cancelButton.click();
    await flush();

    expect(dom.window.location.pathname).toBe(
      `/projects/${emptyProjectShellResponse.project.projectId}`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(dom.window.document.body.textContent).not.toContain(
      'Process registration continues in Story 4.',
    );
  });
});

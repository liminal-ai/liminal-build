import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import { shellBootstrapPayloadSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  emptyProjectShellResponse,
  populatedProjectShellResponse,
} from '../../fixtures/projects.js';

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
  it('TC-4.1a, TC-4.1c, and TC-4.2d show only supported process types with no manual name field', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const pathname = rawUrl.startsWith('http')
        ? new URL(rawUrl).pathname
        : new URL(rawUrl, 'http://localhost:5001').pathname;

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
    expect(dom.window.document.querySelector('input')).toBeNull();
    expect(dom.window.document.body.textContent).not.toContain('UnsupportedProcess');
  });

  it('TC-6.1b cancel process creation keeps the user in the same project shell without a write', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const pathname = rawUrl.startsWith('http')
        ? new URL(rawUrl).pathname
        : new URL(rawUrl, 'http://localhost:5001').pathname;

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
    expect(dom.window.document.body.textContent).not.toContain('Choose a supported process type.');
  });

  it('TC-4.4b creates a process, inserts it at the top, and focuses it in the route', async () => {
    const createdProcess = {
      processId: 'process-created-001',
      displayLabel: 'Product Definition #1',
      processType: 'ProductDefinition',
      status: 'draft',
      phaseLabel: 'Draft',
      nextActionLabel: 'Open the process',
      availableActions: ['open'],
      hasEnvironment: false,
      updatedAt: '2026-04-13T15:00:00.000Z',
    };
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const pathname = rawUrl.startsWith('http')
        ? new URL(rawUrl).pathname
        : new URL(rawUrl, 'http://localhost:5001').pathname;

      if (pathname === '/auth/me') {
        return buildJsonResponse({
          user: {
            id: 'user:workos-user-1',
            email: 'lee@example.com',
            displayName: 'Lee Moore',
          },
        });
      }

      if (pathname === `/api/projects/${populatedProjectShellResponse.project.projectId}`) {
        return buildJsonResponse(populatedProjectShellResponse);
      }

      if (
        pathname === `/api/projects/${populatedProjectShellResponse.project.projectId}/processes`
      ) {
        return buildJsonResponse(
          {
            process: createdProcess,
          },
          201,
        );
      }

      throw new Error(`Unexpected fetch request in create-process-modal test: ${pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: `http://localhost:5001/projects/${populatedProjectShellResponse.project.projectId}`,
    });

    (dom.window as unknown as Window & typeof globalThis).__SHELL_BOOTSTRAP__ =
      shellBootstrapPayloadSchema.parse({
        actor: {
          id: 'user:workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        pathname: `/projects/${populatedProjectShellResponse.project.projectId}`,
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

    const productDefinitionButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'ProductDefinition',
    );

    if (!(productDefinitionButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected ProductDefinition create button to be present.');
    }

    productDefinitionButton.click();
    await flush();
    await flush();

    expect(dom.window.location.search).toBe(`?processId=${createdProcess.processId}`);
    const selectedProcess = dom.window.document.querySelector('[data-process-selected="true"]');
    expect(selectedProcess?.textContent).toContain(createdProcess.displayLabel);
    const firstProcessHeading = dom.window.document.querySelector('section ul li strong');
    expect(firstProcessHeading?.textContent).toBe(createdProcess.displayLabel);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/${populatedProjectShellResponse.project.projectId}/processes`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});

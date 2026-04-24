// @vitest-environment jsdom

import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import {
  packageMemberReviewSchema,
  packageMemberSchema,
  packageReviewTargetSchema,
  reviewTargetSchema,
  reviewWorkspaceResponseSchema,
  shellBootstrapPayloadSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  currentArtifactVersionFixture,
  markdownArtifactVersionDetailFixture,
  readyArtifactReviewTargetFixture,
} from '../../fixtures/artifact-versions.js';
import { readyPackageMemberFixture } from '../../fixtures/package-snapshots.js';
import { readyArtifactReviewWorkspaceFixture } from '../../fixtures/review-workspace.js';

type DeferredResponse = {
  promise: Promise<Response>;
  resolve: (body: unknown) => void;
};

const secondReadyMemberFixture = packageMemberSchema.parse({
  memberId: 'package-member-002',
  position: 1,
  artifactId: 'artifact-002',
  displayName: 'Implementation Notes',
  versionId: 'artifact-version-002',
  versionLabel: 'checkpoint-20260422121000',
  status: 'ready',
});

function buildPackageReview(selectedMemberId: string, body: string) {
  const selectedMember =
    selectedMemberId === readyPackageMemberFixture.memberId
      ? readyPackageMemberFixture
      : secondReadyMemberFixture;

  return packageReviewTargetSchema.parse({
    packageId: 'package-stale-selection',
    displayName: 'Stale Selection Package',
    packageType: 'FeatureSpecificationOutput',
    members: [readyPackageMemberFixture, secondReadyMemberFixture],
    selectedMemberId: selectedMember.memberId,
    selectedMember: packageMemberReviewSchema.parse({
      memberId: selectedMember.memberId,
      status: 'ready',
      artifact: {
        ...readyArtifactReviewTargetFixture,
        artifactId: selectedMember.artifactId,
        displayName: selectedMember.displayName,
        currentVersionId: selectedMember.versionId,
        currentVersionLabel: selectedMember.versionLabel,
        selectedVersionId: selectedMember.versionId,
        versions: [
          {
            ...currentArtifactVersionFixture,
            versionId: selectedMember.versionId,
            versionLabel: selectedMember.versionLabel,
          },
        ],
        selectedVersion: {
          ...markdownArtifactVersionDetailFixture,
          versionId: selectedMember.versionId,
          versionLabel: selectedMember.versionLabel,
          body,
        },
      },
    }),
    exportability: { available: true },
  });
}

const initialPackageReviewFixture = buildPackageReview(
  readyPackageMemberFixture.memberId,
  '<h1>Initial member</h1>',
);

const packageWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project: readyArtifactReviewWorkspaceFixture.project,
  process: {
    ...readyArtifactReviewWorkspaceFixture.process,
    reviewTargetKind: 'package',
    reviewTargetId: initialPackageReviewFixture.packageId,
  },
  availableTargets: [
    {
      position: 0,
      targetKind: 'package',
      targetId: initialPackageReviewFixture.packageId,
      displayName: initialPackageReviewFixture.displayName,
    },
  ],
  target: reviewTargetSchema.parse({
    targetKind: 'package',
    displayName: initialPackageReviewFixture.displayName,
    status: 'ready',
    package: initialPackageReviewFixture,
  }),
});

function buildJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function createDeferredResponse(): DeferredResponse {
  let resolve: DeferredResponse['resolve'] | undefined;
  const promise = new Promise<Response>((innerResolve) => {
    resolve = (body) => {
      innerResolve(buildJsonResponse(body));
    };
  });

  if (resolve === undefined) {
    throw new Error('Expected deferred response resolver to be initialized.');
  }

  return { promise, resolve };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function renderReviewApp(fetchMock: typeof fetch) {
  vi.stubGlobal('fetch', fetchMock);
  const startUrl = `http://localhost:5001/projects/${packageWorkspaceFixture.project.projectId}/processes/${packageWorkspaceFixture.process.processId}/review?targetKind=package&targetId=${initialPackageReviewFixture.packageId}`;
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: startUrl,
  });
  const url = new URL(startUrl);

  (dom.window as unknown as Window & typeof globalThis).__SHELL_BOOTSTRAP__ =
    shellBootstrapPayloadSchema.parse({
      actor: {
        id: 'user:workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      pathname: url.pathname,
      search: url.search,
      csrfToken: 'csrf-token',
      auth: {
        loginPath: '/auth/login',
        logoutPath: '/auth/logout',
      },
    });

  await bootstrapApp(dom.window as unknown as Window & typeof globalThis);
  await flush();

  return dom;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('package member navigation', () => {
  it('drops stale package member responses when a newer member selection wins', async () => {
    const staleMemberRequest = createDeferredResponse();
    const currentMemberRequest = createDeferredResponse();
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(rawUrl, 'http://localhost:5001');

      if (url.pathname === '/auth/me') {
        return Promise.resolve(
          buildJsonResponse({
            user: {
              id: 'user:workos-user-1',
              email: 'lee@example.com',
              displayName: 'Lee Moore',
            },
          }),
        );
      }

      if (
        url.pathname ===
        `/api/projects/${packageWorkspaceFixture.project.projectId}/processes/${packageWorkspaceFixture.process.processId}/review`
      ) {
        return Promise.resolve(buildJsonResponse(packageWorkspaceFixture));
      }

      if (
        url.pathname ===
          `/api/projects/${packageWorkspaceFixture.project.projectId}/processes/${packageWorkspaceFixture.process.processId}/review/packages/${initialPackageReviewFixture.packageId}` &&
        url.searchParams.get('memberId') === secondReadyMemberFixture.memberId
      ) {
        return staleMemberRequest.promise;
      }

      if (
        url.pathname ===
          `/api/projects/${packageWorkspaceFixture.project.projectId}/processes/${packageWorkspaceFixture.process.processId}/review/packages/${initialPackageReviewFixture.packageId}` &&
        url.searchParams.get('memberId') === readyPackageMemberFixture.memberId
      ) {
        return currentMemberRequest.promise;
      }

      return Promise.reject(new Error(`Unexpected fetch request: ${url.pathname}${url.search}`));
    });
    const dom = await renderReviewApp(fetchMock);
    const staleMemberButton = dom.window.document.querySelector(
      `[data-package-member-id="${secondReadyMemberFixture.memberId}"]`,
    );
    const currentMemberButton = dom.window.document.querySelector(
      `[data-package-member-id="${readyPackageMemberFixture.memberId}"]`,
    );

    if (
      !(staleMemberButton instanceof dom.window.HTMLElement) ||
      !(currentMemberButton instanceof dom.window.HTMLElement)
    ) {
      throw new Error('Expected both package member options to be rendered.');
    }

    staleMemberButton.click();
    currentMemberButton.click();
    currentMemberRequest.resolve(
      buildPackageReview(readyPackageMemberFixture.memberId, '<h1>Current member wins</h1>'),
    );
    await flush();
    staleMemberRequest.resolve(
      buildPackageReview(secondReadyMemberFixture.memberId, '<h1>Stale member replay</h1>'),
    );
    await flush();

    expect(dom.window.document.body.textContent).toContain('Current member wins');
    expect(dom.window.document.body.textContent).not.toContain('Stale member replay');
    expect(dom.window.location.href).toContain(`memberId=${readyPackageMemberFixture.memberId}`);
  });
});

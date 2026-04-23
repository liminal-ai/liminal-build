// @vitest-environment jsdom

import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderReviewWorkspacePage } from '../../../apps/platform/client/features/review/review-workspace-page.js';
import {
  exportablePackageReviewWorkspaceFixture,
  multiTargetReviewWorkspaceFixture,
  readyArtifactReviewWorkspaceFixture,
  zeroTargetReviewWorkspaceFixture,
} from '../../fixtures/review-workspace.js';

function buildStore(overrides: Parameters<typeof createAppStore>[0] = {}) {
  return createAppStore({
    auth: {
      actor: {
        id: 'user:workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      isResolved: true,
      csrfToken: 'csrf-token',
    },
    route: {
      pathname: '/projects/project-review-001/processes/process-review-001/review',
      projectId: readyArtifactReviewWorkspaceFixture.project.projectId,
      selectedProcessId: null,
    },
    reviewWorkspace: {
      projectId: readyArtifactReviewWorkspaceFixture.project.projectId,
      processId: readyArtifactReviewWorkspaceFixture.process.processId,
      selection: null,
      project: readyArtifactReviewWorkspaceFixture.project,
      process: readyArtifactReviewWorkspaceFixture.process,
      availableTargets: readyArtifactReviewWorkspaceFixture.availableTargets,
      target: readyArtifactReviewWorkspaceFixture.target ?? null,
      isLoading: false,
      error: null,
    },
    ...overrides,
  });
}

function renderPage(overrides: Parameters<typeof createAppStore>[0] = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const onOpenProcess = vi.fn();
  const onOpenReview = vi.fn();
  const onSelectArtifactVersion = vi.fn();
  const onSelectPackageMember = vi.fn();
  const store = buildStore(overrides);
  const page = renderReviewWorkspacePage({
    store,
    targetDocument: dom.window.document,
    targetWindow: dom.window as unknown as Window & typeof globalThis,
    onOpenProcess,
    onOpenReview,
    onSelectArtifactVersion,
    onSelectPackageMember,
  });

  dom.window.document.body.append(page);

  return { dom, onOpenProcess, onOpenReview, onSelectArtifactVersion, onSelectPackageMember };
}

describe('review workspace page', () => {
  it('TC-1.2a keeps project, process, and artifact target context visible together', () => {
    const { dom } = renderPage();

    expect(dom.window.document.querySelector('[data-review-workspace="true"]')).not.toBeNull();
    expect(dom.window.document.body.textContent).toContain(
      readyArtifactReviewWorkspaceFixture.project.name,
    );
    expect(dom.window.document.body.textContent).toContain(
      readyArtifactReviewWorkspaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).toContain(
      readyArtifactReviewWorkspaceFixture.target?.displayName ?? '',
    );
    expect(dom.window.document.body.textContent).toContain('Target kind: Artifact');
  });

  it('TC-1.2b renders target selection state without stale target content', () => {
    const { dom, onOpenReview } = renderPage({
      reviewWorkspace: {
        projectId: multiTargetReviewWorkspaceFixture.project.projectId,
        processId: multiTargetReviewWorkspaceFixture.process.processId,
        selection: null,
        project: multiTargetReviewWorkspaceFixture.project,
        process: multiTargetReviewWorkspaceFixture.process,
        availableTargets: multiTargetReviewWorkspaceFixture.availableTargets,
        target: null,
        isLoading: false,
        error: null,
      },
    });
    const firstTargetButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === readyArtifactReviewWorkspaceFixture.target?.displayName,
    );

    expect(dom.window.document.body.textContent).toContain('Select a review target');
    expect(dom.window.document.body.textContent).toContain(
      multiTargetReviewWorkspaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).not.toContain('Status: ready');

    if (!(firstTargetButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the target selection state to render a target button.');
    }

    firstTargetButton.click();

    expect(onOpenReview).toHaveBeenCalledWith(
      multiTargetReviewWorkspaceFixture.project.projectId,
      multiTargetReviewWorkspaceFixture.process.processId,
      {
        targetKind: 'artifact',
        targetId: readyArtifactReviewWorkspaceFixture.target?.artifact?.artifactId,
      },
    );
  });

  it('TC-1.3b identifies package review targets on first render', () => {
    const { dom } = renderPage({
      reviewWorkspace: {
        projectId: exportablePackageReviewWorkspaceFixture.project.projectId,
        processId: exportablePackageReviewWorkspaceFixture.process.processId,
        selection: {
          targetKind: 'package',
          targetId: exportablePackageReviewWorkspaceFixture.target?.package?.packageId,
        },
        project: exportablePackageReviewWorkspaceFixture.project,
        process: exportablePackageReviewWorkspaceFixture.process,
        availableTargets: exportablePackageReviewWorkspaceFixture.availableTargets,
        target: exportablePackageReviewWorkspaceFixture.target ?? null,
        isLoading: false,
        error: null,
      },
    });

    expect(dom.window.document.body.textContent).toContain('Package review');
    expect(dom.window.document.body.textContent).toContain('Target kind: Package');
    expect(dom.window.document.body.textContent).toContain(
      exportablePackageReviewWorkspaceFixture.target?.displayName ?? '',
    );
  });

  it('TC-1.4a back-to-process returns to the same process context', () => {
    const { dom, onOpenProcess } = renderPage();
    const backButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Back to process',
    );

    if (!(backButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the review workspace to render a back-to-process button.');
    }

    backButton.click();

    expect(onOpenProcess).toHaveBeenCalledWith(
      readyArtifactReviewWorkspaceFixture.project.projectId,
      readyArtifactReviewWorkspaceFixture.process.processId,
    );
  });

  it('TC-1.1e renders the empty target state when no reviewable targets exist', () => {
    const { dom } = renderPage({
      reviewWorkspace: {
        projectId: zeroTargetReviewWorkspaceFixture.project.projectId,
        processId: zeroTargetReviewWorkspaceFixture.process.processId,
        selection: null,
        project: zeroTargetReviewWorkspaceFixture.project,
        process: zeroTargetReviewWorkspaceFixture.process,
        availableTargets: [],
        target: null,
        isLoading: false,
        error: null,
      },
    });

    expect(dom.window.document.body.textContent).toContain(
      'No review targets are available for this process yet.',
    );
  });
});

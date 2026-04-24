// @vitest-environment jsdom

import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderReviewWorkspacePage } from '../../../apps/platform/client/features/review/review-workspace-page.js';
import {
  exportablePackageReviewWorkspaceFixture,
  multiTargetReviewWorkspaceFixture,
  readyArtifactReviewWorkspaceFixture,
  unavailableReviewWorkspaceFixture,
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
      exportState: {
        isExporting: false,
        lastExportByPackageId: {},
        error: null,
      },
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
  const onExportPackage = vi.fn();
  const onExportExpired = vi.fn();
  const store = buildStore(overrides);
  const page = renderReviewWorkspacePage({
    store,
    targetDocument: dom.window.document,
    targetWindow: dom.window as unknown as Window & typeof globalThis,
    onOpenProcess,
    onOpenReview,
    onSelectArtifactVersion,
    onSelectPackageMember,
    onExportPackage,
    onExportExpired,
  });

  dom.window.document.body.append(page);

  return {
    dom,
    onOpenProcess,
    onOpenReview,
    onSelectArtifactVersion,
    onSelectPackageMember,
    onExportPackage,
    onExportExpired,
  };
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
        exportState: {
          isExporting: false,
          lastExportByPackageId: {},
          error: null,
        },
      },
    });
    const firstTargetOption = [...dom.window.document.querySelectorAll('[role="option"]')].find(
      (option) =>
        option.textContent?.includes(readyArtifactReviewWorkspaceFixture.target?.displayName ?? ''),
    );

    expect(dom.window.document.body.textContent).toContain('Select a review target');
    expect(dom.window.document.body.textContent).toContain(
      multiTargetReviewWorkspaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).not.toContain('Status: ready');

    if (!(firstTargetOption instanceof dom.window.HTMLElement)) {
      throw new Error('Expected the target selection state to render a target option.');
    }

    firstTargetOption.click();

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
        exportState: {
          isExporting: false,
          lastExportByPackageId: {},
          error: null,
        },
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
    const backLink = [...dom.window.document.querySelectorAll('a')].find(
      (link) => link.textContent === 'Back to process',
    );

    if (!(backLink instanceof dom.window.HTMLAnchorElement)) {
      throw new Error('Expected the review workspace to render a back-to-process link.');
    }

    backLink.click();

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
        exportState: {
          isExporting: false,
          lastExportByPackageId: {},
          error: null,
        },
      },
    });

    expect(dom.window.document.body.textContent).toContain(
      'No review targets are available for this process yet.',
    );
  });

  it('TC-6.2a renders an unavailable review target without leaking stale review body content', () => {
    const { dom, onOpenReview } = renderPage({
      reviewWorkspace: {
        projectId: unavailableReviewWorkspaceFixture.project.projectId,
        processId: unavailableReviewWorkspaceFixture.process.processId,
        selection: {
          targetKind: 'package',
          targetId:
            unavailableReviewWorkspaceFixture.target?.package?.packageId ?? 'package-missing-001',
        },
        project: unavailableReviewWorkspaceFixture.project,
        process: unavailableReviewWorkspaceFixture.process,
        availableTargets: unavailableReviewWorkspaceFixture.availableTargets,
        target: {
          targetKind: 'package',
          displayName:
            unavailableReviewWorkspaceFixture.target?.displayName ?? 'Unavailable package',
          status: 'unavailable',
          error: {
            code: 'REVIEW_TARGET_NOT_FOUND',
            message: 'The requested package is unavailable.',
          },
        },
        isLoading: false,
        error: null,
        exportState: {
          isExporting: false,
          lastExportByPackageId: {},
          error: null,
        },
      },
    });
    const alternativeTarget = unavailableReviewWorkspaceFixture.availableTargets[0];
    const alternativeTargetOption = [
      ...dom.window.document.querySelectorAll('[role="option"]'),
    ].find((option) => option.textContent?.includes(alternativeTarget?.displayName ?? ''));

    expect(dom.window.document.body.textContent).toContain('Review target unavailable');
    expect(dom.window.document.body.textContent).toContain('The requested package is unavailable.');
    expect(dom.window.document.body.textContent).not.toContain('Selected member');

    if (!(alternativeTargetOption instanceof dom.window.HTMLElement) || !alternativeTarget) {
      throw new Error('Expected the unavailable review state to render another target selector.');
    }

    alternativeTargetOption.click();

    expect(onOpenReview).toHaveBeenCalledWith(
      unavailableReviewWorkspaceFixture.project.projectId,
      unavailableReviewWorkspaceFixture.process.processId,
      {
        targetKind: alternativeTarget.targetKind,
        targetId: alternativeTarget.targetId,
      },
    );
  });

  it('renders a review-target unavailable message when a targeted fetch rejects after the workspace is open', () => {
    const { dom } = renderPage({
      reviewWorkspace: {
        ...buildStore().get().reviewWorkspace,
        project: readyArtifactReviewWorkspaceFixture.project,
        process: readyArtifactReviewWorkspaceFixture.process,
        availableTargets: readyArtifactReviewWorkspaceFixture.availableTargets,
        target: readyArtifactReviewWorkspaceFixture.target ?? null,
        error: {
          code: 'REVIEW_TARGET_NOT_FOUND',
          message: 'The requested artifact or artifact version is unavailable.',
          status: 404,
        },
      },
    });

    expect(dom.window.document.body.textContent).toContain(
      readyArtifactReviewWorkspaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).toContain('Review target unavailable');
    expect(dom.window.document.body.textContent).not.toContain('Feature Specification - Current');
  });
});

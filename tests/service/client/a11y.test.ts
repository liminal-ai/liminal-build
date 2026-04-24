// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

const { renderMermaidMock } = vi.hoisted(() => ({
  renderMermaidMock: vi.fn(),
}));

vi.mock('../../../apps/platform/client/features/review/mermaid-runtime.js', () => ({
  initializeMermaid: vi.fn(),
  renderMermaid: renderMermaidMock,
}));

import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { createShellApp } from '../../../apps/platform/client/app/shell-app.js';
import { renderArtifactReviewPanel } from '../../../apps/platform/client/features/review/artifact-review-panel.js';
import { renderExportTrigger } from '../../../apps/platform/client/features/review/export-trigger.js';
import { renderMarkdownBody } from '../../../apps/platform/client/features/review/markdown-body.js';
import { renderPackageMemberNav } from '../../../apps/platform/client/features/review/package-member-nav.js';
import { renderReviewWorkspacePage } from '../../../apps/platform/client/features/review/review-workspace-page.js';
import { renderUnsupportedFallback } from '../../../apps/platform/client/features/review/unsupported-fallback.js';
import { renderVersionSwitcher } from '../../../apps/platform/client/features/review/version-switcher.js';
import { packageMemberSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  markdownArtifactVersionDetailFixture,
  readyArtifactReviewTargetFixture,
} from '../../fixtures/artifact-versions.js';
import { exportPackageResponseFixture } from '../../fixtures/export-responses.js';
import {
  readyPackageMemberFixture,
  unavailablePackageFixture,
} from '../../fixtures/package-snapshots.js';
import {
  readyArtifactReviewWorkspaceFixture,
  unavailableReviewWorkspaceFixture,
} from '../../fixtures/review-workspace.js';

function renderWorkspace() {
  const store = createAppStore({
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
  });

  return renderReviewWorkspacePage({
    store,
    targetDocument: document,
    targetWindow: window,
    onOpenProcess: vi.fn(),
    onOpenReview: vi.fn(),
    onSelectArtifactVersion: vi.fn(),
    onSelectPackageMember: vi.fn(),
    onExportPackage: vi.fn(),
    onExportExpired: vi.fn(),
  });
}

function createWorkspaceStore() {
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
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  renderMermaidMock.mockReset();
});

describe('review workspace accessibility', () => {
  it('renders the review workspace as a named region', () => {
    const page = renderWorkspace();

    expect(page.matches('section[data-review-workspace="true"]')).toBe(true);
    expect(page.querySelector('[data-review-heading="true"]')?.textContent).toBe(
      readyArtifactReviewWorkspaceFixture.project.name,
    );
  });

  it('moves focus to the review heading when the shell renders the route', () => {
    const root = document.createElement('div');
    const store = createWorkspaceStore();
    document.body.append(root);

    createShellApp({
      root,
      store,
      targetWindow: window,
      onCreateProject: vi.fn(),
      onOpenCreateProject: vi.fn(),
      onCancelCreateProject: vi.fn(),
      onCreateProcess: vi.fn(),
      onOpenCreateProcess: vi.fn(),
      onCancelCreateProcess: vi.fn(),
      onOpenProject: vi.fn(),
      onOpenProcess: vi.fn(),
      onOpenReview: vi.fn(),
      onSelectArtifactVersion: vi.fn(),
      onSelectPackageMember: vi.fn(),
      onExportPackage: vi.fn(),
      onExportExpired: vi.fn(),
      onStartProcess: vi.fn(),
      onResumeProcess: vi.fn(),
      onRehydrateEnvironment: vi.fn(),
      onRebuildEnvironment: vi.fn(),
      onSubmitProcessResponse: vi.fn(),
      onRetryLiveSubscription: vi.fn(),
    }).render();

    expect(document.activeElement?.getAttribute('data-review-heading')).toBe('true');
  });

  it('renders package member navigation as a listbox with options', () => {
    const nav = renderPackageMemberNav({
      members: unavailablePackageFixture.members,
      selectedMemberId: unavailablePackageFixture.selectedMemberId,
      targetDocument: document,
      onSelect: vi.fn(),
    });

    expect(nav.getAttribute('data-package-member-nav')).toBe('true');
    expect(nav.querySelector('[role="listbox"]')).not.toBeNull();
    expect(nav.querySelectorAll('[role="option"]')).toHaveLength(
      unavailablePackageFixture.members.length,
    );
  });

  it('keeps the version switcher keyboard reachable through a listbox', () => {
    const switcher = renderVersionSwitcher({
      versions: readyArtifactReviewTargetFixture.versions,
      selectedVersionId: readyArtifactReviewTargetFixture.selectedVersionId,
      targetDocument: document,
      onSelect: vi.fn(),
    });
    const options = switcher.querySelectorAll('[role="option"]');

    expect(switcher.querySelector('[role="listbox"]')).not.toBeNull();
    expect(options).toHaveLength(readyArtifactReviewTargetFixture.versions.length);
    expect(switcher.querySelectorAll('[role="option"][aria-selected="true"]')).toHaveLength(1);
  });

  it('moves version selection with arrow keys and activates with Enter', () => {
    const onSelect = vi.fn();
    const switcher = renderVersionSwitcher({
      versions: readyArtifactReviewTargetFixture.versions,
      selectedVersionId: readyArtifactReviewTargetFixture.selectedVersionId,
      targetDocument: document,
      onSelect,
    });
    const selectedOption = switcher.querySelector('[role="option"][aria-selected="true"]');

    if (!(selectedOption instanceof HTMLElement)) {
      throw new Error('Expected selected version option.');
    }

    selectedOption.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const nextOption = switcher.querySelector('[role="option"][tabindex="0"]');

    expect(nextOption?.getAttribute('aria-selected')).toBe('true');
    nextOption?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('keeps package member choices keyboard reachable through options', () => {
    const onSelect = vi.fn();
    const nav = renderPackageMemberNav({
      members: unavailablePackageFixture.members,
      selectedMemberId: readyPackageMemberFixture.memberId,
      targetDocument: document,
      onSelect,
    });
    const readyButton = nav.querySelector(
      `[data-package-member-id="${readyPackageMemberFixture.memberId}"]`,
    );

    expect(readyButton).toBeInstanceOf(HTMLElement);
    (readyButton as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith(readyPackageMemberFixture.memberId);
  });

  it('prevents unavailable package members from being activated', () => {
    const unavailableMember = unavailablePackageFixture.members.find(
      (member) => member.status === 'unavailable',
    );
    const nav = renderPackageMemberNav({
      members: unavailablePackageFixture.members,
      selectedMemberId: unavailablePackageFixture.selectedMemberId,
      targetDocument: document,
      onSelect: vi.fn(),
    });

    expect(
      nav
        .querySelector(`[data-package-member-id="${unavailableMember?.memberId ?? ''}"]`)
        ?.getAttribute('aria-disabled'),
    ).toBe('true');
  });

  it('allows keyboard traversal away from a disabled selected package member', () => {
    const firstMember = packageMemberSchema.parse({
      memberId: 'member-ready-1',
      artifactId: 'artifact-ready-1',
      versionId: 'artifact-ready-1-version-1',
      position: 0,
      displayName: 'Ready member 1',
      versionLabel: 'v1',
      status: 'ready',
    });
    const selectedUnavailableMember = packageMemberSchema.parse({
      memberId: 'member-unavailable-2',
      artifactId: 'artifact-unavailable-2',
      versionId: 'artifact-unavailable-2-version-1',
      position: 1,
      displayName: 'Unavailable member 2',
      versionLabel: 'v1',
      status: 'unavailable',
    });
    const thirdMember = packageMemberSchema.parse({
      memberId: 'member-ready-3',
      artifactId: 'artifact-ready-3',
      versionId: 'artifact-ready-3-version-1',
      position: 2,
      displayName: 'Ready member 3',
      versionLabel: 'v1',
      status: 'ready',
    });
    const onSelect = vi.fn();
    const nav = renderPackageMemberNav({
      members: [firstMember, selectedUnavailableMember, thirdMember],
      selectedMemberId: selectedUnavailableMember.memberId,
      targetDocument: document,
      onSelect,
    });
    document.body.append(nav);

    const firstOption = nav.querySelector<HTMLElement>(
      `[data-package-member-id="${firstMember.memberId}"]`,
    );
    const selectedOption = nav.querySelector<HTMLElement>(
      `[data-package-member-id="${selectedUnavailableMember.memberId}"]`,
    );
    const thirdOption = nav.querySelector<HTMLElement>(
      `[data-package-member-id="${thirdMember.memberId}"]`,
    );

    expect(firstOption).toBeInstanceOf(HTMLElement);
    expect(selectedOption).toBeInstanceOf(HTMLElement);
    expect(thirdOption).toBeInstanceOf(HTMLElement);
    expect(selectedOption?.tabIndex).toBe(0);
    expect(selectedOption?.getAttribute('aria-disabled')).toBe('true');

    selectedOption?.focus();
    selectedOption?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(document.activeElement).toBe(thirdOption);
    expect(thirdOption?.tabIndex).toBe(0);
    expect(selectedOption?.tabIndex).toBe(-1);

    thirdOption?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    selectedOption?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(firstOption);

    selectedOption?.focus();
    selectedOption?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();

    thirdOption?.focus();
    thirdOption?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith(thirdMember.memberId);
  });

  it('renders export as a native button control', () => {
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: null,
      error: null,
      targetDocument: document,
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
    });

    expect(trigger.querySelector('button')?.textContent).toBe('Export package');
  });

  it('announces export state changes in an aria-live region', () => {
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: exportPackageResponseFixture,
      error: null,
      targetDocument: document,
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
    });

    expect(trigger.querySelector('[aria-live="polite"]')?.textContent).toContain('Download');
  });

  it('renders unavailable review targets as readable text', () => {
    const store = createAppStore({
      reviewWorkspace: {
        projectId: unavailableReviewWorkspaceFixture.project.projectId,
        processId: unavailableReviewWorkspaceFixture.process.processId,
        selection: null,
        project: unavailableReviewWorkspaceFixture.project,
        process: unavailableReviewWorkspaceFixture.process,
        availableTargets: unavailableReviewWorkspaceFixture.availableTargets,
        target: {
          targetKind: 'package',
          displayName: 'Unavailable package',
          status: 'unavailable',
          error: {
            code: 'REVIEW_TARGET_NOT_FOUND',
            message: 'The requested package is unavailable.',
          },
        },
        isLoading: false,
        error: null,
        exportState: { isExporting: false, lastExportByPackageId: {}, error: null },
      },
    });
    const page = renderReviewWorkspacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProcess: vi.fn(),
      onOpenReview: vi.fn(),
      onSelectArtifactVersion: vi.fn(),
      onSelectPackageMember: vi.fn(),
      onExportPackage: vi.fn(),
      onExportExpired: vi.fn(),
    });

    expect(page.textContent).toContain('Review target unavailable');
    expect(page.textContent).toContain('The requested package is unavailable.');
  });

  it('renders body render failures as readable text', () => {
    const selectedVersion = readyArtifactReviewTargetFixture.selectedVersion;
    if (selectedVersion === undefined) {
      throw new Error('Expected selected version fixture.');
    }

    const panel = renderArtifactReviewPanel({
      artifact: {
        ...readyArtifactReviewTargetFixture,
        selectedVersion: {
          ...selectedVersion,
          bodyStatus: 'error',
          body: undefined,
          mermaidBlocks: undefined,
          bodyError: {
            code: 'REVIEW_RENDER_FAILED',
            message: 'The selected review target could not be rendered.',
          },
        },
      },
      targetDocument: document,
      onSelectVersion: vi.fn(),
    });

    expect(panel.textContent).toContain('The selected review target could not be rendered.');
  });

  it('renders unavailable package members as readable text', () => {
    const nav = renderPackageMemberNav({
      members: unavailablePackageFixture.members,
      selectedMemberId: unavailablePackageFixture.selectedMemberId,
      targetDocument: document,
      onSelect: vi.fn(),
    });

    expect(nav.textContent).toContain('Unavailable');
  });

  it('preserves a sensible heading order in the review workspace', () => {
    const page = renderWorkspace();
    const headings = [...page.querySelectorAll('h2,h3,h4')].map((heading) => heading.tagName);

    expect(headings.slice(0, 3)).toEqual(['H2', 'H4', 'H3']);
  });

  it('renders links with accessible names and uses an anchor for back-to-process', () => {
    const page = renderWorkspace();
    const backLink = page.querySelector('a[href*="/processes/process-review-001"]');
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: exportPackageResponseFixture,
      error: null,
      targetDocument: document,
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
    });

    expect(backLink?.textContent).toBe('Back to process');
    for (const link of trigger.querySelectorAll('a')) {
      expect(link.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it('does not render unnamed images in review workspace components', () => {
    const page = renderWorkspace();

    for (const image of page.querySelectorAll('img')) {
      expect(image.getAttribute('alt') ?? '').not.toBe('');
    }
  });

  it('does not render unlabeled form inputs in review workspace components', () => {
    const page = renderWorkspace();

    expect(page.querySelectorAll('input, textarea, select')).toHaveLength(0);
  });

  it('keeps readable text in every interactive button', () => {
    const page = renderWorkspace();

    for (const button of page.querySelectorAll('button')) {
      expect(button.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it('renders Mermaid failures as readable text', async () => {
    renderMermaidMock.mockResolvedValueOnce({ error: 'Parse error' });
    const body = renderMarkdownBody({
      body: '<div class="mermaid-placeholder" data-block-id="mermaid-block-1"></div>',
      mermaidBlocks: [{ blockId: 'mermaid-block-1', source: 'graph TD\nBroken -->' }],
      targetDocument: document,
      renderContext: {
        artifactDisplayName: 'Feature Specification',
        artifactId: 'artifact-001',
        versionId: 'version-001',
      },
    });
    document.body.append(body);

    await vi.waitFor(() => {
      expect(body.querySelector('[data-mermaid-error="true"]')?.textContent).toContain(
        'Diagram could not render.',
      );
    });
  });

  it('renders unsupported fallback states as readable text', () => {
    const fallback = renderUnsupportedFallback({
      targetDocument: document,
      versionLabel: markdownArtifactVersionDetailFixture.versionLabel,
      createdAt: markdownArtifactVersionDetailFixture.createdAt,
    });

    expect(fallback.textContent).toContain('not reviewable in the current release');
    expect(fallback.textContent).toContain('Supported formats: markdown');
  });
});

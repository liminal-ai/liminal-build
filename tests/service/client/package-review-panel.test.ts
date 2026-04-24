// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  packageMemberReviewSchema,
  packageMemberSchema,
  packageReviewTargetSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { readyArtifactReviewTargetFixture } from '../../fixtures/artifact-versions.js';
import {
  firstReadySelectedPackageFixture,
  readyPackageMemberFixture,
  unavailablePackageFixture,
} from '../../fixtures/package-snapshots.js';
import { exportPackageResponseFixture } from '../../fixtures/export-responses.js';
import { renderPackageReviewPanel } from '../../../apps/platform/client/features/review/package-review-panel.js';

const secondReadyMemberFixture = packageMemberSchema.parse({
  memberId: 'package-member-003',
  position: 1,
  artifactId: 'artifact-002',
  displayName: 'Implementation Notes',
  versionId: 'artifact-version-002',
  versionLabel: 'checkpoint-20260422121000',
  status: 'ready',
});

const twoReadyMembersFixture = packageReviewTargetSchema.parse({
  packageId: 'package-004',
  displayName: 'Two Ready Members',
  packageType: 'FeatureSpecificationOutput',
  members: [readyPackageMemberFixture, secondReadyMemberFixture],
  selectedMemberId: readyPackageMemberFixture.memberId,
  selectedMember: packageMemberReviewSchema.parse({
    memberId: readyPackageMemberFixture.memberId,
    status: 'ready',
    artifact: readyArtifactReviewTargetFixture,
  }),
  exportability: {
    available: true,
  },
});

describe('package review panel', () => {
  it('TC-4.1a renders one package as a single reviewable set with package context and selected member detail', () => {
    const panel = renderPackageReviewPanel({
      packageReview: twoReadyMembersFixture,
      targetDocument: document,
      onSelectMember: vi.fn(),
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {},
        error: null,
      },
    });

    expect(panel.getAttribute('data-package-review-panel')).toBe('true');
    expect(panel.textContent).toContain(twoReadyMembersFixture.displayName);
    expect(panel.textContent).toContain(`Package type: ${twoReadyMembersFixture.packageType}`);
    expect(panel.textContent).toContain('Package members');
    expect(panel.textContent).toContain(readyArtifactReviewTargetFixture.displayName);
  });

  it('TC-4.2a and TC-4.2b keep package membership visible in published order', () => {
    const panel = renderPackageReviewPanel({
      packageReview: twoReadyMembersFixture,
      targetDocument: document,
      onSelectMember: vi.fn(),
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {},
        error: null,
      },
    });

    expect(
      [...panel.querySelectorAll('[data-package-member-id]')].map((node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['1. Feature Specification', '2. Implementation Notes']);
  });

  it('TC-4.3a keeps package context visible while one member is under review', () => {
    const panel = renderPackageReviewPanel({
      packageReview: twoReadyMembersFixture,
      targetDocument: document,
      onSelectMember: vi.fn(),
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {},
        error: null,
      },
    });

    expect(panel.textContent).toContain(`Package ID: ${twoReadyMembersFixture.packageId}`);
    expect(panel.textContent).toContain('Selected member');
    expect(panel.querySelector('[data-package-member-nav="true"]')).not.toBeNull();
    expect(panel.querySelector('[data-artifact-review-panel="true"]')).not.toBeNull();
  });

  it('TC-4.3b calls onSelectMember when the user chooses a different ready package member', () => {
    const onSelectMember = vi.fn();
    const panel = renderPackageReviewPanel({
      packageReview: twoReadyMembersFixture,
      targetDocument: document,
      onSelectMember,
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {},
        error: null,
      },
    });
    const targetButton = panel.querySelector(
      `[data-package-member-id="${secondReadyMemberFixture.memberId}"]`,
    );

    if (!(targetButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the package panel to render a ready member button.');
    }

    targetButton.click();

    expect(onSelectMember).toHaveBeenCalledWith(secondReadyMemberFixture.memberId);
  });

  it('TC-4.3c renders the server-selected first reviewable member when no explicit member is selected', () => {
    const panel = renderPackageReviewPanel({
      packageReview: firstReadySelectedPackageFixture,
      targetDocument: document,
      onSelectMember: vi.fn(),
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {},
        error: null,
      },
    });

    expect(panel.textContent).toContain(readyPackageMemberFixture.displayName);
    expect(
      panel
        .querySelector(`[data-package-member-id="${readyPackageMemberFixture.memberId}"]`)
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('TC-4.4a keeps healthy members visible when one member is unavailable', () => {
    const panel = renderPackageReviewPanel({
      packageReview: unavailablePackageFixture,
      targetDocument: document,
      onSelectMember: vi.fn(),
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {},
        error: null,
      },
    });
    const unavailableButton = panel.querySelector(
      `[data-package-member-id="${unavailablePackageFixture.members[1]?.memberId ?? ''}"]`,
    );

    expect(panel.textContent).toContain(unavailablePackageFixture.displayName);
    expect(panel.textContent).toContain('The pinned package member is currently unavailable.');
    expect(panel.textContent).toContain(readyPackageMemberFixture.displayName);
    expect(unavailableButton).toHaveProperty('disabled', true);
  });

  it('TC-5.1b hides the export trigger when the package is not exportable', () => {
    const panel = renderPackageReviewPanel({
      packageReview: unavailablePackageFixture,
      targetDocument: document,
      onSelectMember: vi.fn(),
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {
          [unavailablePackageFixture.packageId]: exportPackageResponseFixture,
        },
        error: null,
      },
    });

    expect(panel.querySelector('[data-export-trigger="true"]')).toBeNull();
  });

  it('scopes completed export links to the package that started the request', () => {
    const packageA = twoReadyMembersFixture;
    const packageB = packageReviewTargetSchema.parse({
      ...twoReadyMembersFixture,
      packageId: 'package-b',
      displayName: 'Package B',
    });

    const packageBPanel = renderPackageReviewPanel({
      packageReview: packageB,
      targetDocument: document,
      onSelectMember: vi.fn(),
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {
          [packageA.packageId]: exportPackageResponseFixture,
        },
        error: null,
      },
    });

    expect(packageBPanel.querySelector('[data-export-download-link="package-b"]')).toBeNull();

    const packageAPanel = renderPackageReviewPanel({
      packageReview: packageA,
      targetDocument: document,
      onSelectMember: vi.fn(),
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
      exportState: {
        isExporting: false,
        lastExportByPackageId: {
          [packageA.packageId]: exportPackageResponseFixture,
        },
        error: null,
      },
    });

    expect(
      packageAPanel.querySelector(`[data-export-download-link="${packageA.packageId}"]`),
    ).not.toBeNull();
  });
});

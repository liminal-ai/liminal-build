import type {
  ExportPackageResponse,
  PackageReviewTarget,
  RequestError,
} from '../../../shared/contracts/index.js';
import { renderArtifactReviewPanel } from './artifact-review-panel.js';
import { renderExportTrigger } from './export-trigger.js';
import { renderPackageMemberNav } from './package-member-nav.js';

function createHeading(targetDocument: Document, text: string, level: 'h3' | 'h4' = 'h3') {
  const heading = targetDocument.createElement(level);
  heading.textContent = text;
  return heading;
}

function createParagraph(targetDocument: Document, text: string) {
  const paragraph = targetDocument.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}

export function renderPackageReviewPanel(args: {
  packageReview: PackageReviewTarget;
  targetDocument: Document;
  onSelectMember: (memberId: string) => void;
  onExport: () => void;
  onExportExpired: () => void;
  exportState: {
    isExporting: boolean;
    lastExportByPackageId: Record<string, ExportPackageResponse>;
    error: RequestError | null;
  };
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const selectedMember = args.packageReview.selectedMember;

  container.setAttribute('data-package-review-panel', 'true');
  container.append(
    createHeading(args.targetDocument, args.packageReview.displayName),
    createParagraph(args.targetDocument, `Package ID: ${args.packageReview.packageId}`),
    createParagraph(args.targetDocument, `Package type: ${args.packageReview.packageType}`),
    createParagraph(args.targetDocument, `Members: ${args.packageReview.members.length}`),
    renderPackageMemberNav({
      members: args.packageReview.members,
      selectedMemberId: args.packageReview.selectedMemberId,
      targetDocument: args.targetDocument,
      onSelect: args.onSelectMember,
    }),
  );

  if (args.packageReview.exportability.available) {
    container.append(
      renderExportTrigger({
        packageId: args.packageReview.packageId,
        isExporting: args.exportState.isExporting,
        lastExport: args.exportState.lastExportByPackageId[args.packageReview.packageId] ?? null,
        error: args.exportState.error,
        targetDocument: args.targetDocument,
        onExport: args.onExport,
        onExportExpired: args.onExportExpired,
      }),
    );
  }

  if (selectedMember === undefined) {
    return container;
  }

  container.append(createHeading(args.targetDocument, 'Selected member', 'h4'));

  if (selectedMember.status === 'unsupported') {
    const member = args.packageReview.members.find(
      (candidate) => candidate.memberId === selectedMember.memberId,
    );

    container.append(
      createParagraph(
        args.targetDocument,
        `Selected version: ${member?.versionLabel ?? 'Unknown version'}`,
      ),
      createParagraph(
        args.targetDocument,
        selectedMember.error?.message ?? 'This package member is not reviewable.',
      ),
    );
    return container;
  }

  if (selectedMember.status !== 'ready' || selectedMember.artifact === undefined) {
    container.append(
      createParagraph(
        args.targetDocument,
        selectedMember.error?.message ?? 'This package member is unavailable.',
      ),
    );
    return container;
  }

  container.append(
    renderArtifactReviewPanel({
      artifact: selectedMember.artifact,
      targetDocument: args.targetDocument,
      onSelectVersion: () => {},
      showVersionSwitcher: false,
    }),
  );

  return container;
}

import type {
  ReviewTargetSummary,
  ReviewWorkspaceSelection,
} from '../../../shared/contracts/index.js';
import type { AppStore } from '../../app/store.js';
import { renderShellHeader } from '../projects/shell-header.js';
import {
  renderForbiddenProcessState,
  renderMissingProcessState,
  renderMissingProjectState,
} from '../projects/unavailable-state.js';
import { renderArtifactReviewPanel } from './artifact-review-panel.js';
import { renderPackageReviewPanel } from './package-review-panel.js';

function formatProcessTypeLabel(processType: string): string {
  return processType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function createHeading(targetDocument: Document, level: 'h2' | 'h3' | 'h4', text: string) {
  const heading = targetDocument.createElement(level);
  heading.textContent = text;
  return heading;
}

function getProcessReviewPath(projectId: string, processId: string): string {
  return `/projects/${projectId}/processes/${processId}`;
}

function moveListboxSelection(args: { options: HTMLElement[]; nextIndex: number }): void {
  const boundedIndex = Math.max(0, Math.min(args.nextIndex, args.options.length - 1));

  for (const [index, option] of args.options.entries()) {
    const isSelected = index === boundedIndex;
    option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    option.tabIndex = isSelected ? 0 : -1;
  }

  args.options[boundedIndex]?.focus();
}

function createParagraph(targetDocument: Document, text: string) {
  const paragraph = targetDocument.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}

function renderTargetSelector(args: {
  targetDocument: Document;
  projectId: string;
  processId: string;
  targets: ReviewTargetSummary[];
  title: string;
  description: string;
  onOpenReview: (
    projectId: string,
    processId: string,
    selection?: ReviewWorkspaceSelection | null,
  ) => void;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const targetList = args.targetDocument.createElement('ul');

  section.append(
    createHeading(args.targetDocument, 'h4', args.title),
    createParagraph(args.targetDocument, args.description),
  );
  targetList.role = 'listbox';
  targetList.setAttribute('aria-label', args.title);
  targetList.setAttribute('data-review-target-selector', 'true');

  for (const [index, target] of args.targets.entries()) {
    const item = args.targetDocument.createElement('li');
    const meta = args.targetDocument.createElement('p');

    item.role = 'option';
    item.tabIndex = index === 0 ? 0 : -1;
    item.textContent = target.displayName;
    item.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    item.setAttribute('data-review-target-id', target.targetId);
    item.addEventListener('click', () => {
      args.onOpenReview(args.projectId, args.processId, {
        targetKind: target.targetKind,
        targetId: target.targetId,
      });
    });
    item.addEventListener('keydown', (event) => {
      const options = [
        ...(item.parentElement?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
      ];
      const currentIndex = options.indexOf(item);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveListboxSelection({ options, nextIndex: currentIndex + 1 });
          return;
        case 'ArrowUp':
          event.preventDefault();
          moveListboxSelection({ options, nextIndex: currentIndex - 1 });
          return;
        case 'Home':
          event.preventDefault();
          moveListboxSelection({ options, nextIndex: 0 });
          return;
        case 'End':
          event.preventDefault();
          moveListboxSelection({ options, nextIndex: options.length - 1 });
          return;
        case 'Enter':
        case ' ':
          event.preventDefault();
          args.onOpenReview(args.projectId, args.processId, {
            targetKind: target.targetKind,
            targetId: target.targetId,
          });
          return;
      }
    });
    meta.textContent = `Target kind: ${target.targetKind === 'artifact' ? 'Artifact' : 'Package'}`;
    item.append(meta);
    targetList.append(item);
  }

  section.append(targetList);
  return section;
}

export function renderReviewWorkspacePage(args: {
  store: AppStore;
  targetDocument: Document;
  targetWindow: Window & typeof globalThis;
  onOpenProcess: (projectId: string, processId: string) => void;
  onOpenReview: (
    projectId: string,
    processId: string,
    selection?: ReviewWorkspaceSelection | null,
  ) => void;
  onSelectArtifactVersion: (
    projectId: string,
    processId: string,
    artifactId: string,
    versionId: string,
  ) => void;
  onSelectPackageMember: (
    projectId: string,
    processId: string,
    packageId: string,
    memberId: string,
  ) => void;
  onExportPackage: (projectId: string, processId: string, packageId: string) => void;
  onExportExpired: (projectId: string, processId: string, packageId: string) => void;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const reviewWorkspace = args.store.get().reviewWorkspace;

  container.setAttribute('data-review-workspace', 'true');
  container.append(
    renderShellHeader({
      store: args.store,
      targetDocument: args.targetDocument,
      targetWindow: args.targetWindow,
    }),
  );

  if (reviewWorkspace.isLoading) {
    container.append(createParagraph(args.targetDocument, 'Loading review workspace...'));
    return container;
  }

  if (reviewWorkspace.error?.code === 'PROJECT_FORBIDDEN') {
    container.append(renderForbiddenProcessState(args.targetDocument));
    return container;
  }

  if (reviewWorkspace.error?.code === 'PROJECT_NOT_FOUND') {
    container.append(renderMissingProjectState(args.targetDocument));
    return container;
  }

  if (reviewWorkspace.error?.code === 'PROCESS_NOT_FOUND') {
    container.append(renderMissingProcessState(args.targetDocument));
    return container;
  }

  if (reviewWorkspace.project === null || reviewWorkspace.process === null) {
    const failure = args.targetDocument.createElement('section');
    failure.append(
      createHeading(args.targetDocument, 'h2', 'Review workspace failed to load'),
      createParagraph(
        args.targetDocument,
        reviewWorkspace.error?.message ?? 'The review workspace is unavailable.',
      ),
    );
    container.append(failure);
    return container;
  }

  const backLink = args.targetDocument.createElement('a');
  const project = reviewWorkspace.project;
  const process = reviewWorkspace.process;
  backLink.href = getProcessReviewPath(project.projectId, process.processId);
  backLink.textContent = 'Back to process';
  backLink.addEventListener('click', (event) => {
    event.preventDefault();
    args.onOpenProcess(project.projectId, process.processId);
  });
  const reviewHeading = args.targetDocument.createElement('h1');
  reviewHeading.textContent = project.name;
  reviewHeading.tabIndex = -1;
  reviewHeading.setAttribute('data-review-heading', 'true');

  container.append(
    backLink,
    reviewHeading,
    createParagraph(args.targetDocument, `Role: ${project.role}`),
    createHeading(args.targetDocument, 'h2', process.displayLabel),
    createParagraph(
      args.targetDocument,
      `Process type: ${formatProcessTypeLabel(process.processType)}`,
    ),
  );

  if (reviewWorkspace.error !== null) {
    const failure = args.targetDocument.createElement('section');
    const title =
      reviewWorkspace.error.code === 'REVIEW_TARGET_NOT_FOUND'
        ? 'Review target unavailable'
        : 'Review workspace failed to load';

    failure.append(
      createHeading(args.targetDocument, 'h4', title),
      createParagraph(args.targetDocument, reviewWorkspace.error.message),
    );
    container.append(failure);
    return container;
  }

  if (reviewWorkspace.target === null || reviewWorkspace.target === undefined) {
    if (reviewWorkspace.availableTargets.length === 0) {
      container.append(
        createHeading(args.targetDocument, 'h4', 'Review workspace'),
        createParagraph(
          args.targetDocument,
          'No review targets are available for this process yet.',
        ),
      );
      return container;
    }

    container.append(
      renderTargetSelector({
        targetDocument: args.targetDocument,
        projectId: project.projectId,
        processId: process.processId,
        targets: reviewWorkspace.availableTargets,
        title: 'Select a review target',
        description:
          'Choose an artifact or package to review without leaving this process context.',
        onOpenReview: args.onOpenReview,
      }),
    );
    return container;
  }

  const target = reviewWorkspace.target;

  if (target === undefined) {
    return container;
  }

  container.append(
    createHeading(
      args.targetDocument,
      'h4',
      target.targetKind === 'artifact' ? 'Artifact review' : 'Package review',
    ),
    createParagraph(args.targetDocument, `Target: ${target.displayName}`),
    createParagraph(
      args.targetDocument,
      `Target kind: ${target.targetKind === 'artifact' ? 'Artifact' : 'Package'}`,
    ),
    createParagraph(args.targetDocument, `Status: ${target.status}`),
  );

  if (target.status === 'unavailable' || target.status === 'error') {
    container.append(
      createHeading(
        args.targetDocument,
        'h4',
        target.status === 'unavailable' ? 'Review target unavailable' : 'Review target degraded',
      ),
      createParagraph(
        args.targetDocument,
        target.error?.message ?? 'The requested review target is unavailable.',
      ),
    );

    if (reviewWorkspace.availableTargets.length > 0) {
      container.append(
        renderTargetSelector({
          targetDocument: args.targetDocument,
          projectId: project.projectId,
          processId: process.processId,
          targets: reviewWorkspace.availableTargets,
          title: 'Choose another review target',
          description:
            'You can switch to another available artifact or package without leaving this process context.',
          onOpenReview: args.onOpenReview,
        }),
      );
    }

    return container;
  }

  if (target.targetKind === 'artifact' && target.artifact !== undefined) {
    const artifact = target.artifact;

    container.append(
      renderArtifactReviewPanel({
        artifact,
        targetDocument: args.targetDocument,
        onSelectVersion: (versionId) => {
          args.onSelectArtifactVersion(
            project.projectId,
            process.processId,
            artifact.artifactId,
            versionId,
          );
        },
      }),
    );
  }

  if (target.targetKind === 'package' && target.package !== undefined) {
    const packageReview = target.package;

    container.append(
      renderPackageReviewPanel({
        packageReview,
        targetDocument: args.targetDocument,
        onSelectMember: (memberId) => {
          args.onSelectPackageMember(
            project.projectId,
            process.processId,
            packageReview.packageId,
            memberId,
          );
        },
        onExport: () => {
          args.onExportPackage(project.projectId, process.processId, packageReview.packageId);
        },
        onExportExpired: () => {
          args.onExportExpired(project.projectId, process.processId, packageReview.packageId);
        },
        exportState: reviewWorkspace.exportState,
      }),
    );
  }

  return container;
}

import type { ReviewWorkspaceSelection } from '../../../shared/contracts/index.js';
import type { AppStore } from '../../app/store.js';
import { renderShellHeader } from '../projects/shell-header.js';
import {
  renderForbiddenProcessState,
  renderMissingProcessState,
  renderMissingProjectState,
} from '../projects/unavailable-state.js';
import { renderArtifactReviewPanel } from './artifact-review-panel.js';

function formatProcessTypeLabel(processType: string): string {
  return processType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function createHeading(targetDocument: Document, level: 'h2' | 'h3' | 'h4', text: string) {
  const heading = targetDocument.createElement(level);
  heading.textContent = text;
  return heading;
}

function createParagraph(targetDocument: Document, text: string) {
  const paragraph = targetDocument.createElement('p');
  paragraph.textContent = text;
  return paragraph;
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

  if (
    reviewWorkspace.error !== null ||
    reviewWorkspace.project === null ||
    reviewWorkspace.process === null
  ) {
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

  const backButton = args.targetDocument.createElement('button');
  backButton.type = 'button';
  backButton.textContent = 'Back to process';
  const project = reviewWorkspace.project;
  const process = reviewWorkspace.process;
  backButton.addEventListener('click', () => {
    args.onOpenProcess(project.projectId, process.processId);
  });

  container.append(
    backButton,
    createHeading(args.targetDocument, 'h2', project.name),
    createParagraph(args.targetDocument, `Role: ${project.role}`),
    createHeading(args.targetDocument, 'h3', process.displayLabel),
    createParagraph(
      args.targetDocument,
      `Process type: ${formatProcessTypeLabel(process.processType)}`,
    ),
  );

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
      createHeading(args.targetDocument, 'h4', 'Select a review target'),
      createParagraph(
        args.targetDocument,
        'Choose an artifact or package to review without leaving this process context.',
      ),
    );

    const targetList = args.targetDocument.createElement('div');
    targetList.setAttribute('data-review-target-selector', 'true');

    for (const target of reviewWorkspace.availableTargets) {
      const item = args.targetDocument.createElement('div');
      const button = args.targetDocument.createElement('button');
      const meta = args.targetDocument.createElement('p');

      button.type = 'button';
      button.textContent = target.displayName;
      button.addEventListener('click', () => {
        args.onOpenReview(project.projectId, process.processId, {
          targetKind: target.targetKind,
          targetId: target.targetId,
        });
      });
      meta.textContent = `Target kind: ${target.targetKind === 'artifact' ? 'Artifact' : 'Package'}`;
      item.append(button, meta);
      targetList.append(item);
    }

    container.append(targetList);
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
    container.append(
      createParagraph(args.targetDocument, `Package type: ${target.package.packageType}`),
      createParagraph(args.targetDocument, `Members: ${target.package.members.length}`),
    );
  }

  return container;
}

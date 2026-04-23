import type { ArtifactReviewTarget } from '../../../shared/contracts/index.js';
import { renderMarkdownBody } from './markdown-body.js';
import { renderUnsupportedFallback } from './unsupported-fallback.js';
import { renderVersionSwitcher } from './version-switcher.js';

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

export function renderArtifactReviewPanel(args: {
  artifact: ArtifactReviewTarget;
  targetDocument: Document;
  onSelectVersion: (versionId: string) => void;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const selectedVersion = args.artifact.selectedVersion;

  container.setAttribute('data-artifact-review-panel', 'true');
  container.append(
    createHeading(args.targetDocument, args.artifact.displayName),
    createParagraph(args.targetDocument, `Artifact ID: ${args.artifact.artifactId}`),
    createParagraph(
      args.targetDocument,
      `Current version: ${args.artifact.currentVersionLabel ?? 'No durable version yet'}`,
    ),
    createParagraph(
      args.targetDocument,
      `Selected version: ${selectedVersion?.versionLabel ?? 'No durable version selected'}`,
    ),
  );

  if (args.artifact.versions.length === 0) {
    container.append(
      createParagraph(
        args.targetDocument,
        'No reviewable version is currently available for this artifact.',
      ),
    );
    return container;
  }

  container.append(
    renderVersionSwitcher({
      versions: args.artifact.versions,
      selectedVersionId: args.artifact.selectedVersionId,
      targetDocument: args.targetDocument,
      onSelect: args.onSelectVersion,
    }),
  );

  if (selectedVersion === undefined) {
    return container;
  }

  container.append(
    createHeading(args.targetDocument, selectedVersion.versionLabel, 'h4'),
    createParagraph(args.targetDocument, `Created: ${selectedVersion.createdAt}`),
  );

  if (selectedVersion.contentKind === 'unsupported') {
    container.append(
      renderUnsupportedFallback({
        targetDocument: args.targetDocument,
        versionLabel: selectedVersion.versionLabel,
        createdAt: selectedVersion.createdAt,
      }),
    );
    return container;
  }

  if (selectedVersion.bodyStatus === 'error') {
    container.append(
      createParagraph(
        args.targetDocument,
        selectedVersion.bodyError?.message ?? 'This artifact version could not be rendered.',
      ),
    );
    return container;
  }

  if (selectedVersion.body !== undefined) {
    container.append(
      renderMarkdownBody({
        body: selectedVersion.body,
        mermaidBlocks: selectedVersion.mermaidBlocks,
        targetDocument: args.targetDocument,
        renderContext: {
          artifactDisplayName: args.artifact.displayName,
          artifactId: args.artifact.artifactId,
          versionId: selectedVersion.versionId,
        },
      }),
    );
  }

  return container;
}

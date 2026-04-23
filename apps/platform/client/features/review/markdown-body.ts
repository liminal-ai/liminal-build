import type { MermaidBlock } from '../../../shared/contracts/index.js';
import { mermaidCache } from './mermaid-cache.js';
import { renderMermaid } from './mermaid-runtime.js';

interface MermaidFailureContext {
  artifactDisplayName?: string;
  artifactId?: string;
  versionId?: string;
}

function createMermaidFailure(args: {
  targetDocument: Document;
  blockId: string;
  context?: MermaidFailureContext;
}): HTMLElement {
  const { targetDocument } = args;
  const container = targetDocument.createElement('figure');
  const title = targetDocument.createElement('p');
  const details = targetDocument.createElement('p');
  const artifactLabel =
    args.context?.artifactDisplayName?.trim() ||
    args.context?.artifactId?.trim() ||
    'Unknown artifact';
  const versionId = args.context?.versionId?.trim() ?? 'unknown';

  container.setAttribute('data-mermaid-error', 'true');
  container.setAttribute('data-mermaid-block-id', args.blockId);

  if (args.context?.artifactId !== undefined) {
    container.setAttribute('data-artifact-id', args.context.artifactId);
  }

  if (args.context?.versionId !== undefined) {
    container.setAttribute('data-version-id', args.context.versionId);
  }

  title.textContent = 'Diagram could not render.';
  details.textContent = `Artifact: ${artifactLabel} (version ${versionId}, block ${args.blockId}).`;
  container.append(title, details);
  return container;
}

async function hydrateMermaidBlocks(args: {
  body: HTMLElement;
  mermaidBlocks: MermaidBlock[];
  themeId: string;
  targetDocument: Document;
  renderContext?: MermaidFailureContext;
}): Promise<void> {
  const blockById = new Map(args.mermaidBlocks.map((block) => [block.blockId, block]));
  const placeholders = args.body.querySelectorAll<HTMLElement>(
    '.mermaid-placeholder[data-block-id]',
  );

  for (const placeholder of placeholders) {
    const blockId = placeholder.dataset.blockId;

    if (blockId === undefined) {
      continue;
    }

    const block = blockById.get(blockId);

    if (block === undefined) {
      placeholder.replaceChildren(
        createMermaidFailure({
          targetDocument: args.targetDocument,
          blockId,
          context: args.renderContext,
        }),
      );
      continue;
    }

    const cachedSvg = mermaidCache.get(block.source, args.themeId);

    if (cachedSvg !== null) {
      placeholder.innerHTML = cachedSvg;
      placeholder.setAttribute('data-mermaid-rendered', 'true');
      continue;
    }

    const rendered = await renderMermaid({
      source: block.source,
      themeId: args.themeId,
    });

    if ('error' in rendered) {
      placeholder.replaceChildren(
        createMermaidFailure({
          targetDocument: args.targetDocument,
          blockId,
          context: args.renderContext,
        }),
      );
      continue;
    }

    mermaidCache.set(block.source, args.themeId, rendered.svg);
    placeholder.innerHTML = rendered.svg;
    placeholder.setAttribute('data-mermaid-rendered', 'true');
  }
}

export function renderMarkdownBody(args: {
  body: string;
  mermaidBlocks?: MermaidBlock[];
  themeId?: string;
  targetDocument: Document;
  renderContext?: MermaidFailureContext;
}): HTMLElement {
  const article = args.targetDocument.createElement('article');
  const themeId = args.themeId ?? 'light';

  article.setAttribute('data-artifact-review-body', 'true');
  article.innerHTML = args.body;

  if (article.querySelector('.mermaid-placeholder[data-block-id]') !== null) {
    void hydrateMermaidBlocks({
      body: article,
      mermaidBlocks: args.mermaidBlocks ?? [],
      themeId,
      targetDocument: args.targetDocument,
      renderContext: args.renderContext,
    });
  }

  return article;
}

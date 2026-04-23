import DOMPurify from 'isomorphic-dompurify';
import MarkdownIt from 'markdown-it';
import type {
  MermaidBlock,
  ReviewTargetError,
} from '../../../shared/contracts/review-workspace.js';
import { createMermaidBlock } from './mermaid-sanitize.js';

export interface RenderArtifactArgs {
  markdown: string;
  themeId: string;
}

export interface RenderArtifactResult {
  body: string;
  mermaidBlocks: MermaidBlock[];
  bodyStatus: 'ready' | 'error';
  bodyError?: ReviewTargetError;
}

export interface MarkdownRendererConfig {
  shikiThemes?: { light: string; dark: string };
  shikiLangs?: string[];
  shikiLangAliases?: Record<string, string>;
}

export class MarkdownRendererService {
  static async create(_config: MarkdownRendererConfig = {}): Promise<MarkdownRendererService> {
    return new MarkdownRendererService();
  }

  render(args: RenderArtifactArgs): RenderArtifactResult {
    try {
      const mermaidBlocks: MermaidBlock[] = [];
      let mermaidBlockIndex = 0;
      const markdownIt = new MarkdownIt({
        html: false,
        linkify: true,
        typographer: false,
      });

      markdownIt.renderer.rules.fence = (tokens, index) => {
        const token = tokens[index];

        if (token === undefined) {
          return '';
        }

        const language = token.info.trim().split(/\s+/u)[0] ?? '';

        if (language === 'mermaid') {
          mermaidBlockIndex += 1;
          const blockId = `mermaid-block-${mermaidBlockIndex}`;
          const mermaidBlock = createMermaidBlock({
            blockId,
            source: token.content,
          });

          if (mermaidBlock !== null) {
            mermaidBlocks.push(mermaidBlock);
          }

          return `<div class="mermaid-placeholder" data-block-id="${blockId}"></div>\n`;
        }

        const escapedLanguage = markdownIt.utils.escapeHtml(language);
        const escapedContent = markdownIt.utils.escapeHtml(token.content);
        const languageClass =
          escapedLanguage.length > 0 ? ` class="language-${escapedLanguage}"` : '';

        return `<pre><code${languageClass}>${escapedContent}</code></pre>\n`;
      };

      const renderedHtml = markdownIt.render(args.markdown);
      const sanitizedHtml = DOMPurify.sanitize(renderedHtml, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'math', 'form'],
        FORBID_ATTR: ['style'],
        ALLOW_DATA_ATTR: false,
        ALLOW_ARIA_ATTR: false,
        ADD_ATTR: ['data-block-id'],
      });

      return {
        body: sanitizedHtml,
        mermaidBlocks,
        bodyStatus: 'ready',
      };
    } catch (error) {
      return {
        body: '',
        mermaidBlocks: [],
        bodyStatus: 'error',
        bodyError: {
          code: 'REVIEW_RENDER_FAILED',
          message:
            error instanceof Error ? error.message : 'This artifact version could not be rendered.',
        },
      };
    }
  }
}

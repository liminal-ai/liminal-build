import type {
  MermaidBlock,
  ReviewTargetError,
} from '../../../shared/contracts/review-workspace.js';

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
    return {
      body: args.markdown,
      mermaidBlocks: [],
      bodyStatus: 'ready',
    };
  }
}

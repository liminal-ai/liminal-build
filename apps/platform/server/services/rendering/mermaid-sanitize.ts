import type { MermaidBlock } from '../../../shared/contracts/review-workspace.js';

export const mermaidDirectivePattern = /^\s*%%\{\s*(?:init|config|wrap)[^%]*%%/gm;

type MermaidSanitizeLogger = {
  warn(fields: Record<string, unknown>, message?: string): void;
};

function detectDirective(match: string): 'init' | 'config' | 'wrap' {
  if (/\bconfig\b/u.test(match)) {
    return 'config';
  }

  if (/\bwrap\b/u.test(match)) {
    return 'wrap';
  }

  return 'init';
}

export function stripMermaidDirectives(
  source: string,
  context: {
    artifactId?: string;
    selectedVersionId?: string;
    blockId?: string;
    logger?: MermaidSanitizeLogger;
  } = {},
): string {
  const directives = source.match(mermaidDirectivePattern) ?? [];

  for (const directive of directives) {
    context.logger?.warn(
      {
        event: 'review.mermaid.directive-stripped',
        artifactId: context.artifactId ?? null,
        selectedVersionId: context.selectedVersionId ?? null,
        blockId: context.blockId ?? null,
        directive: detectDirective(directive),
      },
      'Mermaid directive stripped from review content.',
    );
  }

  return source.replaceAll(mermaidDirectivePattern, '').trim();
}

export function createMermaidBlock(args: {
  artifactId?: string;
  blockId: string;
  logger?: MermaidSanitizeLogger;
  selectedVersionId?: string;
  source: string;
}): MermaidBlock | null {
  const sanitizedSource = stripMermaidDirectives(args.source, {
    artifactId: args.artifactId,
    selectedVersionId: args.selectedVersionId,
    blockId: args.blockId,
    logger: args.logger,
  });

  if (sanitizedSource.length === 0) {
    return null;
  }

  return {
    blockId: args.blockId,
    source: sanitizedSource,
  };
}

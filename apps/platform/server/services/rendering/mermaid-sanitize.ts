import type { MermaidBlock } from '../../../shared/contracts/review-workspace.js';

export const mermaidDirectivePattern = /^\s*%%\{\s*(?:init|config|wrap)[^%]*%%/gm;

export function stripMermaidDirectives(source: string): string {
  return source.replaceAll(mermaidDirectivePattern, '').trim();
}

export function createMermaidBlock(args: { blockId: string; source: string }): MermaidBlock | null {
  const sanitizedSource = stripMermaidDirectives(args.source);

  if (sanitizedSource.length === 0) {
    return null;
  }

  return {
    blockId: args.blockId,
    source: sanitizedSource,
  };
}

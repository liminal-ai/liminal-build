import type { MermaidBlock } from '../../../shared/contracts/review-workspace.js';

export const mermaidDirectivePattern = /^\s*%%\{\s*(?:init|config|wrap)[^%]*%%/gm;

export function stripMermaidDirectives(source: string): string {
  return source.replaceAll(mermaidDirectivePattern, '').trim();
}

export function createMermaidBlock(args: { blockId: string; source: string }): MermaidBlock {
  return {
    blockId: args.blockId,
    source: stripMermaidDirectives(args.source),
  };
}

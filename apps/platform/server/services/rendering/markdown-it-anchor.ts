import type { GithubSlugger } from './github-slugger.js';

export type MarkdownItAnchorPlugin = (markdownIt: unknown) => void;

export function createMarkdownItAnchor(_slugger: GithubSlugger): MarkdownItAnchorPlugin {
  return () => {
    // Story 0 scaffold. Story 3 replaces this with the vendored implementation.
  };
}

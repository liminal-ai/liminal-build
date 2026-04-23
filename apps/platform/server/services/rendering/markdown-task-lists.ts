export type MarkdownTaskListPlugin = (markdownIt: unknown) => void;

export function createMarkdownTaskListsPlugin(): MarkdownTaskListPlugin {
  return () => {
    // Story 0 scaffold. Story 3 replaces this with the read-only task-list renderer.
  };
}

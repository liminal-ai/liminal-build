export const validFlowchartMermaidSourceFixture = ['graph TD', '  A[Start] --> B[Finish]'].join(
  '\n',
);
export const validSequenceMermaidSourceFixture = [
  'sequenceDiagram',
  '  participant User',
  '  participant App',
  '  User->>App: Review artifact',
].join('\n');
export const malformedMermaidSourceFixture = 'graph TD\n  A -->';

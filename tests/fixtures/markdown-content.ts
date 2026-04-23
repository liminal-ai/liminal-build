export const structuredMarkdownFixture = [
  '# Title',
  '',
  'Read the [project docs](https://example.com/docs) before review.',
  '',
  '| Column | Value |',
  '| --- | --- |',
  '| Name | Liminal Build |',
  '',
  '- first',
  '- second',
  '',
  '```ts',
  'export const ready = true;',
  '```',
].join('\n');

export const markdownWithMermaidFixture = [
  '# Diagram',
  '',
  '```mermaid',
  'graph TD',
  '  A[Start] --> B[Finish]',
  '```',
].join('\n');

export const markdownWithMermaidDirectiveFixture = [
  '# Unsafe Diagram',
  '',
  '```mermaid',
  '%%{init: { "securityLevel": "loose" }}%%',
  'graph TD',
  '  A --> B',
  '```',
].join('\n');

export const markdownWithDirectiveOnlyMermaidFixture = [
  '# Directive Only Diagram',
  '',
  '```mermaid',
  "%%{init: {'theme':'dark'}}%%",
  '```',
].join('\n');

export const markdownWithRawHtmlFixture = [
  '# HTML Input',
  '',
  '<script>alert("xss")</script>',
  '<div>inline html</div>',
].join('\n');

import { describe, expect, it } from 'vitest';
import { MarkdownRendererService } from '../../../apps/platform/server/services/rendering/markdown-renderer.service.js';
import {
  markdownWithDirectiveOnlyMermaidFixture,
  markdownWithMermaidDirectiveFixture,
  markdownWithMermaidFixture,
  markdownWithRawHtmlFixture,
  structuredMarkdownFixture,
} from '../../fixtures/markdown-content.js';

describe('markdown renderer', () => {
  function buildLargeMarkdownFixture(targetBytes: number): string {
    const block = [
      '## Review section',
      '',
      'This is a smoke-level rendering proof for Story 3 review content.',
      '',
      '- preserve headings',
      '- preserve lists',
      '- preserve code fences',
      '',
      '```ts',
      'export const proof = true;',
      '```',
      '',
      '| Column | Value |',
      '| --- | --- |',
      '| Status | Ready |',
      '',
    ].join('\n');
    let markdown = '# Large review artifact\n\n';

    while (Buffer.byteLength(markdown, 'utf8') < targetBytes) {
      markdown += `${block}\n`;
    }

    return markdown;
  }

  it('TC-3.1a preserves markdown structure needed for review reading', async () => {
    const renderer = await MarkdownRendererService.create();
    const rendered = renderer.render({
      markdown: structuredMarkdownFixture,
      themeId: 'light',
    });

    expect(rendered.bodyStatus).toBe('ready');
    expect(rendered.body).toContain('<h1>Title</h1>');
    expect(rendered.body).toContain(
      '<p>Read the <a href="https://example.com/docs">project docs</a> before review.</p>',
    );
    expect(rendered.body).toContain('<table>');
    expect(rendered.body).toContain('<ul>');
    expect(rendered.body).toContain('<pre><code class="language-ts">');
  });

  it('treats a zero-byte markdown artifact as a ready empty review body', async () => {
    const renderer = await MarkdownRendererService.create();
    const rendered = renderer.render({
      markdown: '',
      themeId: 'light',
    });

    expect(rendered).toEqual({
      body: '',
      mermaidBlocks: [],
      bodyStatus: 'ready',
    });
  });

  it('TC-3.2a extracts Mermaid blocks into a sidecar and leaves a placeholder in the body', async () => {
    const renderer = await MarkdownRendererService.create();
    const rendered = renderer.render({
      markdown: markdownWithMermaidFixture,
      themeId: 'light',
    });

    expect(rendered.bodyStatus).toBe('ready');
    expect(rendered.mermaidBlocks).toEqual([
      {
        blockId: 'mermaid-block-1',
        source: 'graph TD\n  A[Start] --> B[Finish]',
      },
    ]);
    expect(rendered.body).toContain('class="mermaid-placeholder"');
    expect(rendered.body).toContain('data-block-id="mermaid-block-1"');
  });

  it('strips Mermaid init directives before the browser renderer sees the source', async () => {
    const renderer = await MarkdownRendererService.create();
    const rendered = renderer.render({
      markdown: markdownWithMermaidDirectiveFixture,
      themeId: 'light',
    });

    expect(rendered.bodyStatus).toBe('ready');
    expect(rendered.mermaidBlocks[0]?.source).not.toContain('%%{init');
    expect(rendered.mermaidBlocks[0]?.source).toContain('graph TD');
  });

  it('keeps a placeholder but never forwards raw directive-only Mermaid fences to the client', async () => {
    const renderer = await MarkdownRendererService.create();
    const rendered = renderer.render({
      markdown: markdownWithDirectiveOnlyMermaidFixture,
      themeId: 'light',
    });

    expect(rendered.bodyStatus).toBe('ready');
    expect(rendered.body).toContain('class="mermaid-placeholder"');
    expect(rendered.body).not.toContain("%%{init: {'theme':'dark'}}%%");
    expect(rendered.mermaidBlocks).toEqual([]);
  });

  it('does not allow raw HTML to become executable review content', async () => {
    const renderer = await MarkdownRendererService.create();
    const rendered = renderer.render({
      markdown: markdownWithRawHtmlFixture,
      themeId: 'light',
    });

    expect(rendered.bodyStatus).toBe('ready');
    expect(rendered.body).not.toContain('<script>');
    expect(rendered.body).not.toContain('<div>inline html</div>');
    expect(rendered.body).toContain('&lt;script&gt;alert');
  });

  it('renders a 200 KB markdown review body within the Story 3 smoke budget', async () => {
    const renderer = await MarkdownRendererService.create();
    const markdown = buildLargeMarkdownFixture(200 * 1024);
    const startedAt = performance.now();
    const rendered = renderer.render({
      markdown,
      themeId: 'light',
    });
    const elapsedMs = performance.now() - startedAt;

    expect(Buffer.byteLength(markdown, 'utf8')).toBeGreaterThanOrEqual(200 * 1024);
    expect(rendered.bodyStatus).toBe('ready');
    expect(elapsedMs).toBeLessThan(2_000);
  });
});

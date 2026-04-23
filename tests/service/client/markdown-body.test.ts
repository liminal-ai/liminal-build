// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

const { renderMermaidMock } = vi.hoisted(() => ({
  renderMermaidMock: vi.fn(),
}));

vi.mock('../../../apps/platform/client/features/review/mermaid-runtime.js', () => ({
  initializeMermaid: vi.fn(),
  renderMermaid: renderMermaidMock,
}));

import { renderMarkdownBody } from '../../../apps/platform/client/features/review/markdown-body.js';

afterEach(() => {
  vi.restoreAllMocks();
  renderMermaidMock.mockReset();
  document.body.innerHTML = '';
});

describe('markdown body', () => {
  it('TC-3.1a mounts rendered html with headings, tables, lists, and code blocks intact', () => {
    const body = renderMarkdownBody({
      body: [
        '<h1>Title</h1>',
        '<p>Read the <a href="https://example.com/docs">project docs</a> before review.</p>',
        '<table><thead><tr><th>Column</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>',
        '<ul><li>first</li><li>second</li></ul>',
        '<pre><code class="language-ts">export const ready = true;</code></pre>',
      ].join(''),
      targetDocument: document,
    });

    expect(body.querySelector('h1')?.textContent).toBe('Title');
    expect(body.querySelector('p')?.textContent).toContain('Read the project docs before review.');
    expect(body.querySelector('a')?.getAttribute('href')).toBe('https://example.com/docs');
    expect(body.querySelector('table')).not.toBeNull();
    expect(body.querySelectorAll('li')).toHaveLength(2);
    expect(body.querySelector('pre code')?.textContent).toContain('export const ready = true;');
  });

  it('TC-3.2a hydrates Mermaid placeholders with sanitized SVG output', async () => {
    renderMermaidMock.mockResolvedValueOnce({
      svg: '<svg><text>Diagram</text></svg>',
    });

    const body = renderMarkdownBody({
      body: '<p>Before</p><div class="mermaid-placeholder" data-block-id="block-1"></div><p>After</p>',
      mermaidBlocks: [
        {
          blockId: 'block-1',
          source: 'graph TD\n  A --> B',
        },
      ],
      targetDocument: document,
    });

    document.body.append(body);

    await vi.waitFor(() => {
      expect(body.querySelector('svg')).not.toBeNull();
    });

    expect(body.textContent).toContain('Before');
    expect(body.textContent).toContain('After');
  });

  it('TC-3.3a keeps one Mermaid failure local to the failing diagram', async () => {
    renderMermaidMock.mockResolvedValueOnce({ error: 'Parse error' }).mockResolvedValueOnce({
      svg: '<svg><text>Healthy</text></svg>',
    });

    const body = renderMarkdownBody({
      body: [
        '<div class="mermaid-placeholder" data-block-id="block-1"></div>',
        '<p>Still readable text.</p>',
        '<div class="mermaid-placeholder" data-block-id="block-2"></div>',
      ].join(''),
      mermaidBlocks: [
        {
          blockId: 'block-1',
          source: 'graph TD\n  Broken -->',
        },
        {
          blockId: 'block-2',
          source: 'graph TD\n  B --> C',
        },
      ],
      renderContext: {
        artifactDisplayName: 'Feature Specification',
        artifactId: 'artifact-001',
        versionId: 'artifact-version-001',
      },
      targetDocument: document,
    });

    document.body.append(body);

    await vi.waitFor(() => {
      expect(body.querySelectorAll('svg')).toHaveLength(1);
      expect(body.querySelector('[data-mermaid-error="true"]')).not.toBeNull();
    });

    expect(body.querySelector('[data-mermaid-error="true"]')?.textContent).toContain(
      'Diagram could not render.',
    );
    expect(body.querySelector('[data-mermaid-error="true"]')?.textContent).toContain(
      'Artifact: Feature Specification (version artifact-version-001, block block-1).',
    );
    expect(body.querySelector('[data-mermaid-error="true"]')?.getAttribute('data-version-id')).toBe(
      'artifact-version-001',
    );
    expect(body.querySelector('[data-mermaid-error="true"]')?.textContent).not.toContain(
      'Parse error',
    );
    expect(body.textContent).toContain('Still readable text.');
    expect(body.textContent).toContain('Healthy');
  });

  it('replaces directive-only Mermaid placeholders with a bounded inline failure when no sidecar block remains', async () => {
    const body = renderMarkdownBody({
      body: '<p>Before</p><div class="mermaid-placeholder" data-block-id="block-1"></div><p>After</p>',
      mermaidBlocks: [],
      renderContext: {
        artifactDisplayName: 'Feature Specification',
        artifactId: 'artifact-001',
        versionId: 'artifact-version-001',
      },
      targetDocument: document,
    });

    document.body.append(body);

    await vi.waitFor(() => {
      expect(body.querySelector('[data-mermaid-error="true"]')).not.toBeNull();
    });

    expect(renderMermaidMock).not.toHaveBeenCalled();
    expect(body.querySelector('[data-mermaid-error="true"]')?.textContent).toContain(
      'Artifact: Feature Specification (version artifact-version-001, block block-1).',
    );
    expect(body.querySelector('[data-mermaid-error="true"]')?.getAttribute('data-version-id')).toBe(
      'artifact-version-001',
    );
    expect(body.textContent).toContain('Before');
    expect(body.textContent).toContain('After');
  });
});

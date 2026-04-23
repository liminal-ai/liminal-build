// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { sanitizeMermaidSvg } from '../../../apps/platform/client/features/review/mermaid-runtime.js';

describe('mermaid runtime sanitizer', () => {
  it('removes onload handlers from Mermaid-rendered svg output', () => {
    const sanitized = sanitizeMermaidSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><g onload="alert(1)"><text>Diagram</text></g></svg>',
    );

    expect(sanitized).not.toContain('onload=');
    expect(sanitized).toContain('<svg');
    expect(sanitized).toContain('<text>Diagram</text>');
  });

  it('removes script tags while preserving the surrounding svg structure', () => {
    const sanitized = sanitizeMermaidSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><g><text>Safe</text></g></svg>',
    );

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('<svg');
    expect(sanitized).toContain('<g><text>Safe</text></g>');
  });
});

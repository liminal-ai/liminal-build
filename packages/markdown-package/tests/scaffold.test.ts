import { describe, expect, it } from 'vitest';
import { MANIFEST_FILENAME, parseManifest, scaffoldManifest } from '../src/index.js';

describe('@liminal-build/markdown-package scaffold', () => {
  it('exports the manifest filename constant', () => {
    expect(MANIFEST_FILENAME).toBe('_nav.md');
  });

  it('round-trips manifest metadata through the scaffold helper', () => {
    const markdown = scaffoldManifest({
      metadata: {
        title: 'Package Title',
        packageType: 'FeatureSpecificationOutput',
        packageId: 'pkg-001',
        publishedAt: '2026-04-22T12:00:00.000Z',
      },
      items: [
        {
          title: 'Overview',
          path: 'overview.md',
        },
      ],
    });

    const parsed = parseManifest(markdown);
    expect(parsed.metadata).toEqual({
      title: 'Package Title',
      packageType: 'FeatureSpecificationOutput',
      packageId: 'pkg-001',
      publishedAt: '2026-04-22T12:00:00.000Z',
    });
    expect(parsed.content).toContain('[Overview](overview.md)');
  });
});

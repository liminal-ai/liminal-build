import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceRoot = path.resolve(import.meta.dirname, '../../..');
const clientDistDir = path.join(workspaceRoot, 'apps/platform/dist/client/assets');
const REVIEW_BUNDLE_BUDGET_BYTES = 600 * 1024;

function readClientBundleFiles(): Array<{
  fileName: string;
  path: string;
  source: string;
  gzipBytes: number;
}> {
  if (!existsSync(clientDistDir)) {
    throw new Error('Client dist assets are missing. Run the build before bundle-budget tests.');
  }

  return readdirSync(clientDistDir)
    .filter((fileName) => fileName.endsWith('.js'))
    .map((fileName) => {
      const filePath = path.join(clientDistDir, fileName);
      const source = readFileSync(filePath, 'utf8');
      return {
        fileName,
        path: filePath,
        source,
        gzipBytes: gzipSync(source).byteLength,
      };
    });
}

describe('review workspace client bundle budget', () => {
  it('keeps the review-capable client bundle within the 600 KB gzipped budget', () => {
    const entryBundles = readClientBundleFiles().filter((bundle) =>
      /^index-[\w-]+\.js$/.test(bundle.fileName),
    );
    const totalGzipBytes = entryBundles.reduce((total, bundle) => total + bundle.gzipBytes, 0);

    expect(entryBundles).toHaveLength(1);
    expect(totalGzipBytes).toBeLessThanOrEqual(REVIEW_BUNDLE_BUDGET_BYTES);
  });

  it('keeps isomorphic-dompurify and jsdom out of the production client bundle', () => {
    const allClientCode = readClientBundleFiles()
      .map((bundle) => bundle.source)
      .join('\n');

    expect(allClientCode).not.toContain('isomorphic-dompurify');
    expect(allClientCode).not.toContain('jsdom');
  });
});

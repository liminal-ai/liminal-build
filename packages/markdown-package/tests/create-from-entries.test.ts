import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createPackageFromEntries,
  getManifest,
  listPackage,
  PackageError,
  readDocument,
  scaffoldManifest,
} from '../src/index.js';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

describe('createPackageFromEntries', () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanupPaths.splice(0).map(async (targetPath) => {
        await rm(targetPath, { recursive: true, force: true });
      }),
    );
  });

  it('writes a gzip package whose manifest is first and whose members round-trip', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'markdown-package-'));
    cleanupPaths.push(tempDir);
    const packagePath = path.join(tempDir, 'export.mpkz');
    const archive = createPackageFromEntries({
      compress: true,
      manifest: {
        metadata: {
          title: 'Specification Package',
          packageType: 'FeatureSpecificationOutput',
          packageId: 'package-001',
          publishedAt: '2026-04-23T12:00:00.000Z',
        },
        items: [
          {
            title: 'Feature Specification',
            path: 'feature-specification.md',
          },
          {
            title: 'Implementation Notes',
            path: 'implementation-notes.md',
          },
        ],
      },
      entries: (async function* () {
        yield {
          path: 'feature-specification.md',
          content: '# Feature Specification\n\nPinned body.',
        };
        yield {
          path: 'implementation-notes.md',
          content: '# Implementation Notes\n\nSecond file.',
        };
      })(),
    });

    await writeFile(packagePath, await streamToBuffer(archive));

    expect(await listPackage({ packagePath })).toEqual([
      {
        path: '_nav.md',
        size: Buffer.byteLength(
          scaffoldManifest({
            metadata: {
              title: 'Specification Package',
              packageType: 'FeatureSpecificationOutput',
              packageId: 'package-001',
              publishedAt: '2026-04-23T12:00:00.000Z',
            },
            items: [
              {
                title: 'Feature Specification',
                path: 'feature-specification.md',
              },
              {
                title: 'Implementation Notes',
                path: 'implementation-notes.md',
              },
            ],
          }),
          'utf8',
        ),
      },
      {
        path: 'feature-specification.md',
        size: Buffer.byteLength('# Feature Specification\n\nPinned body.', 'utf8'),
      },
      {
        path: 'implementation-notes.md',
        size: Buffer.byteLength('# Implementation Notes\n\nSecond file.', 'utf8'),
      },
    ]);
    expect(await getManifest({ packagePath })).toContain('packageId: package-001');
    expect(await readDocument({ packagePath, documentPath: 'feature-specification.md' })).toContain(
      'Pinned body.',
    );
  });

  it('rejects archives with duplicate entry paths instead of silently overwriting', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'markdown-package-'));
    cleanupPaths.push(tempDir);
    const packagePath = path.join(tempDir, 'duplicate-paths.mpkz');
    const archive = createPackageFromEntries({
      compress: true,
      manifest: {
        metadata: {
          title: 'Duplicate Package',
          packageType: 'FeatureSpecificationOutput',
          packageId: 'package-duplicate',
          publishedAt: '2026-04-23T12:00:00.000Z',
        },
        items: [
          {
            title: 'First',
            path: 'spec.md',
          },
          {
            title: 'Second',
            path: 'spec.md',
          },
        ],
      },
      entries: (async function* () {
        yield {
          path: 'spec.md',
          content: '# First',
        };
        yield {
          path: 'spec.md',
          content: '# Second',
        };
      })(),
    });

    await writeFile(packagePath, await streamToBuffer(archive));

    await expect(listPackage({ packagePath })).rejects.toMatchObject<Partial<PackageError>>({
      code: 'INVALID_ARCHIVE',
    });
  });

  it('streams larger entry bodies from Readable sources using declared sizes', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'markdown-package-'));
    cleanupPaths.push(tempDir);
    const packagePath = path.join(tempDir, 'streamed.mpkz');
    const entryCount = 20;
    const entryBytes = 200 * 1024;
    const chunkBytes = 16 * 1024;
    let streamReads = 0;

    function createBodyStream(index: number): Readable {
      let emitted = 0;
      return Readable.from(
        (async function* () {
          while (emitted < entryBytes) {
            const size = Math.min(chunkBytes, entryBytes - emitted);
            emitted += size;
            streamReads += 1;
            yield Buffer.alloc(size, String(index % 10));
          }
        })(),
      );
    }

    const archive = createPackageFromEntries({
      compress: true,
      manifest: {
        metadata: {
          title: 'Streamed Package',
          packageType: 'FeatureSpecificationOutput',
          packageId: 'package-streamed',
          publishedAt: '2026-04-23T12:00:00.000Z',
        },
        items: Array.from({ length: entryCount }, (_, index) => ({
          title: `Document ${index + 1}`,
          path: `documents/document-${index + 1}.md`,
        })),
      },
      entries: (async function* () {
        for (let index = 0; index < entryCount; index += 1) {
          yield {
            path: `documents/document-${index + 1}.md`,
            content: createBodyStream(index),
            size: entryBytes,
          };
        }
      })(),
    });

    await writeFile(packagePath, await streamToBuffer(archive));

    expect(streamReads).toBeGreaterThan(entryCount);
    expect(await listPackage({ packagePath })).toHaveLength(entryCount + 1);
    expect(await readDocument({ packagePath, documentPath: 'documents/document-20.md' })).toHaveLength(
      entryBytes,
    );
  });
});

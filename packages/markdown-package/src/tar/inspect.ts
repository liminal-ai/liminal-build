import { MANIFEST_FILENAME } from '../types.js';
import { parseManifest } from '../manifest/parser.js';
import { parsePackageFile } from './package-io.js';

export async function inspectPackage(args: { packagePath: string }) {
  const parsed = await parsePackageFile(args.packagePath);
  const manifestEntry = parsed.entries.find((entry) => entry.path === MANIFEST_FILENAME);

  return {
    compressed: parsed.compressed,
    entryCount: parsed.entries.length,
    entries: parsed.entries.map((entry) => ({
      path: entry.path,
      size: entry.size,
    })),
    manifest: manifestEntry === undefined ? null : parseManifest(manifestEntry.content.toString('utf8')),
  };
}

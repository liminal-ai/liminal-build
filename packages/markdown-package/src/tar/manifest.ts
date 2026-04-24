import { MANIFEST_FILENAME } from '../types.js';
import { parsePackageFile } from './package-io.js';

export async function getManifest(args: { packagePath: string }) {
  const parsed = await parsePackageFile(args.packagePath);
  const manifestEntry = parsed.entries.find((entry) => entry.path === MANIFEST_FILENAME);
  return manifestEntry?.content.toString('utf8') ?? null;
}

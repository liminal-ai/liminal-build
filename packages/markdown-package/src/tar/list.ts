import { parsePackageFile } from './package-io.js';

export async function listPackage(args: { packagePath: string }) {
  const parsed = await parsePackageFile(args.packagePath);
  return parsed.entries.map((entry) => ({
    path: entry.path,
    size: entry.size,
  }));
}

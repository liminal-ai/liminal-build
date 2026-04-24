import { parsePackageFile } from './package-io.js';

export async function readDocument(args: { packagePath: string; documentPath: string }) {
  const parsed = await parsePackageFile(args.packagePath);
  const entry = parsed.entries.find((candidate) => candidate.path === args.documentPath);
  return entry?.content.toString('utf8') ?? null;
}

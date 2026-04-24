import { extractPackageFile } from './package-io.js';

export async function extractPackage(args: { packagePath: string; outputDir: string }) {
  return extractPackageFile(args);
}

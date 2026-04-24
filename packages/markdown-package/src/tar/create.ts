import { createPackageFile } from './package-io.js';

export async function createPackage(args: {
  sourceDir: string;
  outputPath: string;
  compress?: boolean;
  manifestPath?: string;
}): Promise<void> {
  await createPackageFile(args);
}

import type { CreateFromEntriesOptions } from '../types.js';
import { createPackageStream } from './package-io.js';

export function createPackageFromEntries(options: CreateFromEntriesOptions) {
  return createPackageStream(options);
}

import type { Readable } from 'node:stream';
import type { CreateFromEntriesOptions } from '../types.js';
import { notImplemented } from './shared.js';

export function createPackageFromEntries(_options: CreateFromEntriesOptions): Readable {
  return notImplemented('createPackageFromEntries');
}

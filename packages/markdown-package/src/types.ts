import type { Readable } from 'node:stream';

export const MANIFEST_FILENAME = '_nav.md' as const;

export interface ManifestMetadata {
  title?: string;
  packageType?: string;
  packageId?: string;
  publishedAt?: string;
}

export interface ManifestNavigationItem {
  title: string;
  path: string;
}

export interface ManifestScaffold {
  metadata: ManifestMetadata;
  items: ManifestNavigationItem[];
}

export interface PackageEntry {
  path: string;
  content: Readable | Buffer | string;
}

export interface CreateFromEntriesOptions {
  entries: AsyncIterable<PackageEntry>;
  manifest: ManifestScaffold;
  compress?: boolean;
  maxEntryBytes?: number;
  maxTotalBytes?: number;
}

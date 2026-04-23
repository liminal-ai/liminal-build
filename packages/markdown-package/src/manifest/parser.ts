import type { ManifestMetadata } from '../types.js';

export interface ParsedManifest {
  metadata: ManifestMetadata;
  content: string;
}

export function parseManifest(markdown: string): ParsedManifest {
  const match = markdown.match(/^```yaml\n([\s\S]*?)\n```\n*/);
  if (match === null) {
    return {
      metadata: {},
      content: markdown,
    };
  }

  const metadata: ManifestMetadata = {};
  const metadataBlock = match[1] ?? '';
  for (const line of metadataBlock.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key === 'title' || key === 'packageType' || key === 'packageId' || key === 'publishedAt') {
      metadata[key] = value;
    }
  }

  return {
    metadata,
    content: markdown.slice(match[0].length),
  };
}

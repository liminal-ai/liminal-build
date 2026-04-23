import type { ManifestScaffold } from '../types.js';

export function scaffoldManifest(manifest: ManifestScaffold): string {
  const lines = ['```yaml'];
  if (manifest.metadata.title !== undefined) {
    lines.push(`title: ${manifest.metadata.title}`);
  }
  if (manifest.metadata.packageType !== undefined) {
    lines.push(`packageType: ${manifest.metadata.packageType}`);
  }
  if (manifest.metadata.packageId !== undefined) {
    lines.push(`packageId: ${manifest.metadata.packageId}`);
  }
  if (manifest.metadata.publishedAt !== undefined) {
    lines.push(`publishedAt: ${manifest.metadata.publishedAt}`);
  }
  lines.push('```', '');

  const title = manifest.metadata.title ?? 'Untitled package';
  lines.push(`# ${title}`, '');

  manifest.items.forEach((item, index) => {
    lines.push(`${index + 1}. [${item.title}](${item.path})`);
  });

  return lines.join('\n');
}

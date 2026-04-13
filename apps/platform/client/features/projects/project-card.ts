import type { ProjectSummary } from '../../../shared/contracts/index.js';

export function renderProjectCard(args: {
  project: ProjectSummary;
  targetDocument: Document;
}): HTMLElement {
  const article = args.targetDocument.createElement('article');
  const title = args.targetDocument.createElement('a');
  const meta = args.targetDocument.createElement('p');
  const owner = args.targetDocument.createElement('p');

  title.textContent = args.project.name;
  title.href = `/projects/${args.project.projectId}`;
  meta.textContent = `Role: ${args.project.role}`;
  owner.textContent =
    args.project.ownerDisplayName === null
      ? 'Owner unavailable'
      : `Owner: ${args.project.ownerDisplayName}`;
  article.append(title, meta, owner);

  return article;
}

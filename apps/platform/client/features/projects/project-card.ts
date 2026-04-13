import type { ProjectSummary } from '../../../shared/contracts/index.js';

export function renderProjectCard(args: {
  project: ProjectSummary;
  targetDocument: Document;
}): HTMLElement {
  const article = args.targetDocument.createElement('article');
  const title = args.targetDocument.createElement('h3');
  const meta = args.targetDocument.createElement('p');

  title.textContent = args.project.name;
  meta.textContent = `Role: ${args.project.role}`;
  article.append(title, meta);

  return article;
}

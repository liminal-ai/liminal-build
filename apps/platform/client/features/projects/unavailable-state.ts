export function renderForbiddenProjectState(targetDocument: Document): HTMLElement {
  const section = targetDocument.createElement('section');
  const title = targetDocument.createElement('h2');
  const body = targetDocument.createElement('p');

  title.textContent = 'Project unavailable';
  body.textContent = 'The current user does not have access to this project.';
  section.append(title, body);

  return section;
}

export function renderForbiddenProcessState(targetDocument: Document): HTMLElement {
  const section = targetDocument.createElement('section');
  const title = targetDocument.createElement('h2');
  const body = targetDocument.createElement('p');

  title.textContent = 'Access denied';
  body.textContent = 'The current user does not have access to this process.';
  section.append(title, body);

  return section;
}

export function renderMissingProjectState(targetDocument: Document): HTMLElement {
  const section = targetDocument.createElement('section');
  const title = targetDocument.createElement('h2');
  const body = targetDocument.createElement('p');

  title.textContent = 'Project not found';
  body.textContent = 'The requested project could not be found.';
  section.append(title, body);

  return section;
}

export function renderMissingProcessState(targetDocument: Document): HTMLElement {
  const section = targetDocument.createElement('section');
  const title = targetDocument.createElement('h2');
  const body = targetDocument.createElement('p');

  title.textContent = 'Process unavailable';
  body.textContent = 'The requested process could not be found.';
  section.append(title, body);

  return section;
}

export function renderMissingSelectedProcessBanner(
  targetDocument: Document,
  message = 'The requested process is unavailable and the shell should clear the route selection.',
): HTMLElement {
  const banner = targetDocument.createElement('aside');
  banner.textContent = message;
  banner.setAttribute('data-banner-kind', 'missing-selected-process');
  return banner;
}

export function renderCreateProcessModal(targetDocument: Document): HTMLElement {
  const container = targetDocument.createElement('section');
  const title = targetDocument.createElement('h2');
  const body = targetDocument.createElement('p');

  title.textContent = 'Create process';
  body.textContent = 'Story 0 scaffolds the process-picker surface without wiring submit behavior.';
  container.append(title, body);

  return container;
}

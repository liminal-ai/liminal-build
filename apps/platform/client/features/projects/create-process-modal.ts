export function renderCreateProcessModal(args: {
  targetDocument: Document;
  onCancel: () => void;
}): HTMLElement {
  const targetDocument = args.targetDocument;
  const container = targetDocument.createElement('section');
  const title = targetDocument.createElement('h2');
  const body = targetDocument.createElement('p');
  const supportedTypes = targetDocument.createElement('ul');
  const cancel = targetDocument.createElement('button');

  title.textContent = 'Create process';
  body.textContent = 'Choose a supported process type. Process registration continues in Story 4.';
  for (const processType of [
    'ProductDefinition',
    'FeatureSpecification',
    'FeatureImplementation',
  ]) {
    const item = targetDocument.createElement('li');
    item.textContent = processType;
    supportedTypes.append(item);
  }
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    args.onCancel();
  });
  container.append(title, body, supportedTypes, cancel);

  return container;
}

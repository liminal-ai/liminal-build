import type { SupportedProcessType } from '../../../shared/contracts/index.js';

const supportedProcessTypes: SupportedProcessType[] = [
  'ProductDefinition',
  'FeatureSpecification',
  'FeatureImplementation',
];

export function renderCreateProcessModal(args: {
  targetDocument: Document;
  onCreateProcess: (processType: SupportedProcessType) => Promise<void>;
  onCancel: () => void;
}): HTMLElement {
  const targetDocument = args.targetDocument;
  const container = targetDocument.createElement('section');
  const title = targetDocument.createElement('h2');
  const body = targetDocument.createElement('p');
  const supportedTypes = targetDocument.createElement('ul');
  const cancel = targetDocument.createElement('button');

  title.textContent = 'Create process';
  body.textContent = 'Choose a supported process type.';
  for (const processType of supportedProcessTypes) {
    const item = targetDocument.createElement('li');
    const select = targetDocument.createElement('button');
    select.type = 'button';
    select.textContent = processType;
    select.addEventListener('click', () => {
      void args.onCreateProcess(processType);
    });
    item.append(select);
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

import type { CreateSourceAttachmentRequest } from '../../../shared/contracts/index.js';

const sourcePurposeOptions = [
  ['research', 'Research'],
  ['review', 'Review'],
  ['implementation', 'Implementation'],
  ['other', 'Other'],
] as const;

const sourceAccessModeOptions = [
  ['read_only', 'Read only'],
  ['read_write', 'Read write'],
] as const;

export function renderSourceAttachmentComposer(args: {
  title: string;
  description: string;
  scope: 'project' | 'process';
  submitLabel: string;
  targetDocument: Document;
  onAttachSource: (input: CreateSourceAttachmentRequest) => Promise<void>;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const heading = args.targetDocument.createElement('h3');
  const description = args.targetDocument.createElement('p');
  const form = args.targetDocument.createElement('form');
  const repositoryUrlInput = args.targetDocument.createElement('input');
  const displayNameInput = args.targetDocument.createElement('input');
  const purposeSelect = args.targetDocument.createElement('select');
  const accessModeSelect = args.targetDocument.createElement('select');
  const targetRefInput = args.targetDocument.createElement('input');
  const submitButton = args.targetDocument.createElement('button');
  const validation = args.targetDocument.createElement('p');

  section.setAttribute('data-source-attachment-composer', 'true');
  section.setAttribute('data-source-attachment-scope', args.scope);
  heading.textContent = args.title;
  description.textContent = args.description;

  form.setAttribute('data-source-attachment-form', 'true');

  repositoryUrlInput.name = 'repositoryUrl';
  repositoryUrlInput.placeholder = 'Repository URL';
  repositoryUrlInput.required = true;
  repositoryUrlInput.setAttribute('data-source-attachment-repository-url', 'true');

  displayNameInput.name = 'displayName';
  displayNameInput.placeholder = 'Display name';
  displayNameInput.required = true;
  displayNameInput.setAttribute('data-source-attachment-display-name', 'true');

  purposeSelect.name = 'purpose';
  purposeSelect.setAttribute('data-source-attachment-purpose', 'true');
  for (const [value, label] of sourcePurposeOptions) {
    const option = args.targetDocument.createElement('option');
    option.value = value;
    option.textContent = label;
    if (value === 'implementation') {
      option.selected = true;
    }
    purposeSelect.append(option);
  }

  accessModeSelect.name = 'accessMode';
  accessModeSelect.setAttribute('data-source-attachment-access-mode', 'true');
  for (const [value, label] of sourceAccessModeOptions) {
    const option = args.targetDocument.createElement('option');
    option.value = value;
    option.textContent = label;
    if (value === 'read_only') {
      option.selected = true;
    }
    accessModeSelect.append(option);
  }

  targetRefInput.name = 'targetRef';
  targetRefInput.placeholder = 'Target ref (optional)';
  targetRefInput.setAttribute('data-source-attachment-target-ref', 'true');

  submitButton.type = 'submit';
  submitButton.textContent = args.submitLabel;
  submitButton.setAttribute('data-source-attachment-submit', 'true');

  validation.setAttribute('data-source-attachment-validation', 'true');
  validation.setAttribute('role', 'alert');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const repositoryUrl = repositoryUrlInput.value.trim();
    const displayName = displayNameInput.value.trim();
    const targetRef = targetRefInput.value.trim();

    if (repositoryUrl.length === 0 || displayName.length === 0) {
      validation.textContent = 'Enter a repository URL and display name before attaching.';
      return;
    }

    validation.textContent = '';
    submitButton.disabled = true;

    void Promise.resolve(
      args.onAttachSource({
        provider: 'github',
        repositoryUrl,
        displayName,
        purpose: purposeSelect.value as CreateSourceAttachmentRequest['purpose'],
        accessMode: accessModeSelect.value as CreateSourceAttachmentRequest['accessMode'],
        targetRef: targetRef.length > 0 ? targetRef : null,
      }),
    ).finally(() => {
      submitButton.disabled = false;
    });
  });

  form.append(
    repositoryUrlInput,
    displayNameInput,
    purposeSelect,
    accessModeSelect,
    targetRefInput,
    submitButton,
    validation,
  );
  section.append(heading, description, form);

  return section;
}

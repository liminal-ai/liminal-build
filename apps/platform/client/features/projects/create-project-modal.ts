import { ApiRequestError } from '../../browser-api/auth-api.js';

export function renderCreateProjectModal(args: {
  targetDocument: Document;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void>;
}): HTMLElement {
  const targetDocument = args.targetDocument;
  const container = targetDocument.createElement('section');
  const title = targetDocument.createElement('h2');
  const form = targetDocument.createElement('form');
  const label = targetDocument.createElement('label');
  const input = targetDocument.createElement('input');
  const error = targetDocument.createElement('p');
  const actions = targetDocument.createElement('div');
  const cancel = targetDocument.createElement('button');
  const submit = targetDocument.createElement('button');

  title.textContent = 'Create project';
  label.textContent = 'Project name';
  input.name = 'name';
  input.placeholder = 'Core Platform';
  error.hidden = true;
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    args.onCancel();
  });
  submit.type = 'submit';
  submit.textContent = 'Create project';
  label.append(input);
  actions.append(cancel, submit);
  form.append(label, error, actions);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = input.value.trim();

    if (name.length === 0) {
      error.hidden = false;
      error.textContent = 'Project name is required.';
      return;
    }

    submit.disabled = true;
    error.hidden = true;

    try {
      await args.onSubmit(name);
    } catch (thrown) {
      submit.disabled = false;

      if (thrown instanceof ApiRequestError) {
        error.hidden = false;
        error.textContent = thrown.payload.message;
        return;
      }

      throw thrown;
    }
  });
  container.append(title, form);

  return container;
}

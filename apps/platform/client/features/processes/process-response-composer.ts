export interface ProcessResponseComposerDeps {
  targetDocument: Document;
  onSubmitResponse: (message: string) => Promise<void>;
}

export function renderProcessResponseComposer(deps: ProcessResponseComposerDeps): HTMLElement {
  const section = deps.targetDocument.createElement('section');
  const title = deps.targetDocument.createElement('h2');
  const form = deps.targetDocument.createElement('form');
  const textarea = deps.targetDocument.createElement('textarea');
  const submitButton = deps.targetDocument.createElement('button');
  const validation = deps.targetDocument.createElement('p');

  title.textContent = 'Respond in context';
  section.setAttribute('data-process-response-composer', 'true');
  form.setAttribute('data-process-response-form', 'true');

  textarea.name = 'message';
  textarea.rows = 4;
  textarea.placeholder = 'Share your response for this process.';
  textarea.setAttribute('data-process-response-input', 'true');

  submitButton.type = 'submit';
  submitButton.textContent = 'Send response';

  validation.setAttribute('data-process-response-validation', 'true');
  validation.setAttribute('role', 'alert');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const message = textarea.value.trim();

    if (message.length === 0) {
      validation.textContent = 'Enter a response before submitting.';
      return;
    }

    validation.textContent = '';
    submitButton.disabled = true;

    void Promise.resolve(deps.onSubmitResponse(message)).finally(() => {
      submitButton.disabled = false;
    });
  });

  form.append(textarea, submitButton, validation);
  section.append(title, form);
  return section;
}

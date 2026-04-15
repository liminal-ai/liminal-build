import type {
  ProcessSurfaceControlActionId,
  ProcessSurfaceControlState,
} from '../../../shared/contracts/index.js';

export function renderProcessControls(args: {
  controls: ProcessSurfaceControlState[];
  targetDocument: Document;
  onAction: (actionId: ProcessSurfaceControlActionId) => void;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const heading = args.targetDocument.createElement('h4');
  const list = args.targetDocument.createElement('div');

  section.setAttribute('data-process-controls', 'true');
  heading.textContent = 'Controls';
  list.setAttribute('data-process-controls-list', 'true');

  for (const control of args.controls) {
    const item = args.targetDocument.createElement('div');
    const button = args.targetDocument.createElement('button');

    item.setAttribute('data-process-control', control.actionId);
    button.type = 'button';
    button.textContent = control.label;
    button.disabled = !control.enabled;
    button.addEventListener('click', () => {
      if (!control.enabled) {
        return;
      }

      args.onAction(control.actionId);
    });

    item.append(button);

    if (control.disabledReason !== null) {
      const reason = args.targetDocument.createElement('p');
      reason.setAttribute('data-process-control-disabled-reason', control.actionId);
      reason.textContent = control.disabledReason;
      item.append(reason);
    }

    list.append(item);
  }

  section.append(heading, list);
  return section;
}

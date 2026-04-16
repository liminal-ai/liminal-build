import {
  deriveEnvironmentStatusLabel,
  type EnvironmentSummary,
} from '../../../shared/contracts/index.js';
import { renderProcessCheckpointResult } from './process-checkpoint-result.js';

export function renderProcessEnvironmentPanel(args: {
  environment: EnvironmentSummary | null;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const heading = args.targetDocument.createElement('h4');

  section.setAttribute('data-process-environment-panel', 'true');
  heading.textContent = 'Environment';
  section.append(heading);

  if (args.environment === null) {
    const unavailable = args.targetDocument.createElement('p');
    unavailable.textContent = 'Environment information is unavailable.';
    section.append(unavailable);
    return section;
  }

  section.setAttribute('data-environment-state', args.environment.state);

  const status = args.targetDocument.createElement('p');
  status.textContent = `State: ${deriveEnvironmentStatusLabel(args.environment.state)}`;
  section.append(status);

  if (args.environment.environmentId !== null) {
    const environmentId = args.targetDocument.createElement('p');
    environmentId.textContent = `Environment ID: ${args.environment.environmentId}`;
    section.append(environmentId);
  }

  if (args.environment.blockedReason !== null) {
    const blockedReason = args.targetDocument.createElement('p');
    blockedReason.textContent = `Blocked: ${args.environment.blockedReason}`;
    section.append(blockedReason);
  }

  if (args.environment.lastHydratedAt !== null) {
    const lastHydratedAt = args.targetDocument.createElement('p');
    lastHydratedAt.textContent = `Last hydrated: ${args.environment.lastHydratedAt}`;
    section.append(lastHydratedAt);
  }

  if (args.environment.lastCheckpointAt !== null) {
    const lastCheckpointAt = args.targetDocument.createElement('p');
    lastCheckpointAt.textContent = `Last checkpoint: ${args.environment.lastCheckpointAt}`;
    section.append(lastCheckpointAt);
  }

  const checkpointResult = renderProcessCheckpointResult({
    result: args.environment.lastCheckpointResult,
    targetDocument: args.targetDocument,
  });

  if (checkpointResult !== null) {
    section.append(checkpointResult);
  }

  return section;
}

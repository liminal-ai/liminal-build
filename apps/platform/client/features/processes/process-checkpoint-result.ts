import type { LastCheckpointResult } from '../../../shared/contracts/index.js';

function formatCheckpointOutcome(result: LastCheckpointResult): string {
  return result.outcome === 'succeeded' ? 'Succeeded' : 'Failed';
}

export function renderProcessCheckpointResult(args: {
  result: LastCheckpointResult | null;
  targetDocument: Document;
}): HTMLElement | null {
  if (args.result === null) {
    return null;
  }

  const section = args.targetDocument.createElement('section');
  const heading = args.targetDocument.createElement('h5');
  const summary = args.targetDocument.createElement('p');
  const completedAt = args.targetDocument.createElement('p');

  section.setAttribute('data-process-checkpoint-result', 'true');
  section.setAttribute('data-process-checkpoint-kind', args.result.checkpointKind);
  section.setAttribute('data-process-checkpoint-outcome', args.result.outcome);

  heading.textContent = 'Latest checkpoint';
  summary.textContent = `${formatCheckpointOutcome(args.result)} ${args.result.checkpointKind} checkpoint for ${args.result.targetLabel}`;
  completedAt.textContent = `Completed at: ${args.result.completedAt}`;
  section.append(heading, summary, completedAt);

  if (args.result.targetRef !== null) {
    const targetRef = args.targetDocument.createElement('p');
    targetRef.textContent = `Target ref: ${args.result.targetRef}`;
    section.append(targetRef);
  }

  if (args.result.failureReason !== null) {
    const failureReason = args.targetDocument.createElement('p');
    failureReason.textContent = `Failure reason: ${args.result.failureReason}`;
    section.append(failureReason);
  }

  return section;
}

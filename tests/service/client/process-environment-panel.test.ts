import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderProcessEnvironmentPanel } from '../../../apps/platform/client/features/processes/process-environment-panel.js';
import {
  buildEnvironmentSummaryFixture,
  checkpointFailedEnvironmentFixture,
  checkpointSucceededEnvironmentFixture,
  checkpointingEnvironmentFixture,
  codeCheckpointSucceededEnvironmentFixture,
  runningEnvironmentFixture,
} from '../../fixtures/process-environment.js';

function createDocument() {
  return new JSDOM('<!doctype html><html><body></body></html>').window.document;
}

describe('process environment panel', () => {
  it('TC-3.2a panel renders the server-supplied statusLabel for running state', () => {
    const customStatusLabel = 'CUSTOM SERVER LABEL FOR TESTING: running stays verbatim';
    const environment = buildEnvironmentSummaryFixture({
      ...runningEnvironmentFixture,
      statusLabel: customStatusLabel,
    });
    const view = renderProcessEnvironmentPanel({
      environment,
      targetDocument: createDocument(),
    });

    expect(view.textContent).toContain(`State: ${customStatusLabel}`);
  });

  it('TC-3.2b panel trusts the server statusLabel verbatim for checkpointing state', () => {
    const customStatusLabel = 'CUSTOM SERVER LABEL FOR TESTING: checkpointing stays verbatim';
    const environment = buildEnvironmentSummaryFixture({
      ...checkpointingEnvironmentFixture,
      statusLabel: customStatusLabel,
    });
    const view = renderProcessEnvironmentPanel({
      environment,
      targetDocument: createDocument(),
    });

    expect(view.textContent).toContain(`State: ${customStatusLabel}`);
  });

  it('TC-4.4a artifact checkpoint result renders an outcome badge and target label', () => {
    const view = renderProcessEnvironmentPanel({
      environment: checkpointSucceededEnvironmentFixture,
      targetDocument: createDocument(),
    });

    expect(
      view.querySelector('[data-process-checkpoint-outcome-badge="succeeded"]'),
    ).not.toBeNull();
    expect(view.textContent).toContain('Target: Feature Specification Draft');
  });

  it('TC-4.2b and TC-4.4b code checkpoint result renders source target and ref clearly', () => {
    const view = renderProcessEnvironmentPanel({
      environment: codeCheckpointSucceededEnvironmentFixture,
      targetDocument: createDocument(),
    });

    expect(
      view.querySelector('[data-process-checkpoint-outcome-badge="succeeded"]'),
    ).not.toBeNull();
    expect(view.textContent).toContain('Target: liminal-build');
    expect(view.textContent).toContain('Target ref: feature/epic-03');
  });

  it('TC-4.5a artifact checkpoint failure renders a failed badge and failure reason', () => {
    const view = renderProcessEnvironmentPanel({
      environment: checkpointFailedEnvironmentFixture,
      targetDocument: createDocument(),
    });

    expect(view.querySelector('[data-process-checkpoint-outcome-badge="failed"]')).not.toBeNull();
    expect(view.textContent).toContain(
      'Failure reason: Artifact persistence failed before the checkpoint could settle.',
    );
  });
});

import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderProcessEnvironmentPanel } from '../../../apps/platform/client/features/processes/process-environment-panel.js';
import { deriveEnvironmentStatusLabel } from '../../../apps/platform/shared/contracts/index.js';
import {
  buildEnvironmentSummaryFixture,
  checkpointingEnvironmentFixture,
  runningEnvironmentFixture,
} from '../../fixtures/process-environment.js';

function createDocument() {
  return new JSDOM('<!doctype html><html><body></body></html>').window.document;
}

describe('process environment panel', () => {
  it('TC-3.2a panel renders running state as a process-facing label', () => {
    const view = renderProcessEnvironmentPanel({
      environment: buildEnvironmentSummaryFixture({
        ...runningEnvironmentFixture,
        statusLabel: 'provider.exec.stdout.fragment',
      }),
      targetDocument: createDocument(),
    });

    expect(view.textContent).toContain(`State: ${deriveEnvironmentStatusLabel('running')}`);
    expect(view.textContent).not.toContain('provider.exec.stdout.fragment');
  });

  it('TC-3.2b panel shows the current coherent state instead of raw fragments', () => {
    const view = renderProcessEnvironmentPanel({
      environment: buildEnvironmentSummaryFixture({
        ...checkpointingEnvironmentFixture,
        statusLabel: 'provider.exec.checkpoint.stderr',
      }),
      targetDocument: createDocument(),
    });

    expect(view.textContent).toContain(`State: ${deriveEnvironmentStatusLabel('checkpointing')}`);
    expect(view.textContent).not.toContain('provider.exec.checkpoint.stderr');
  });
});

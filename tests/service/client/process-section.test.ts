import { describe, expect, it } from 'vitest';
import { processSectionEnvelopeSchema } from '../../../apps/platform/shared/contracts/index.js';
import { renderProcessSection } from '../../../apps/platform/client/features/projects/process-section.js';
import {
  completedProcessFixture,
  draftProcessFixture,
  failedProcessFixture,
  interruptedProcessFixture,
  pausedProcessFixture,
  runningProcessFixture,
  waitingProcessFixture,
} from '../../fixtures/processes.js';

describe('process section', () => {
  it('TC-3.2a renders full process summary fields', () => {
    const view = renderProcessSection({
      envelope: processSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [runningProcessFixture],
      }),
      selectedProcessId: runningProcessFixture.processId,
      targetDocument: document,
    });

    expect(view.textContent).toContain(runningProcessFixture.displayLabel);
    expect(view.textContent).toContain('Feature Specification');
    expect(view.textContent).toContain('Running');
    expect(view.textContent).toContain(`Phase: ${runningProcessFixture.phaseLabel}`);
    expect(view.textContent).toContain(`Updated: ${runningProcessFixture.updatedAt}`);
    expect(view.textContent).toContain(`Next: ${runningProcessFixture.nextActionLabel}`);
    expect(view.textContent).toContain('Available actions: open, review');
    expect(view.textContent).toContain('Selected process');
  });

  it.each([
    ['TC-3.2b', draftProcessFixture, 'Draft'],
    ['TC-3.2c', runningProcessFixture, 'Running'],
    ['TC-3.2d', waitingProcessFixture, 'Waiting'],
    ['TC-3.2e', pausedProcessFixture, 'Paused'],
    ['TC-3.2f', completedProcessFixture, 'Completed'],
    ['TC-3.2g', failedProcessFixture, 'Failed'],
    ['TC-3.2h', interruptedProcessFixture, 'Interrupted'],
  ])('%s renders the expected process status wording', (_name, processFixture, expectedLabel) => {
    const view = renderProcessSection({
      envelope: processSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [processFixture],
      }),
      selectedProcessId: null,
      targetDocument: document,
    });

    expect(view.textContent).toContain(expectedLabel);
  });

  it('TC-4.4a renders processes in descending updated order', () => {
    const view = renderProcessSection({
      envelope: processSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [draftProcessFixture, runningProcessFixture, waitingProcessFixture],
      }),
      selectedProcessId: null,
      targetDocument: document,
    });

    const labels = [...view.querySelectorAll('li strong')].map((element) => element.textContent);

    expect(labels).toEqual([
      waitingProcessFixture.displayLabel,
      runningProcessFixture.displayLabel,
      draftProcessFixture.displayLabel,
    ]);
  });

  it('TC-5.3a interrupted process shows actionable recovery paths', () => {
    const view = renderProcessSection({
      envelope: processSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [interruptedProcessFixture],
      }),
      selectedProcessId: null,
      targetDocument: document,
    });

    expect(view.textContent).toContain('Interrupted');
    expect(view.textContent).toContain('Available actions: resume, review, rehydrate, restart');
  });

  it('TC-5.3b waiting process shows the blocking user action', () => {
    const view = renderProcessSection({
      envelope: processSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [waitingProcessFixture],
      }),
      selectedProcessId: null,
      targetDocument: document,
    });

    expect(view.textContent).toContain('Waiting');
    expect(view.textContent).toContain('Next: Waiting for user response');
    expect(view.textContent).toContain('Available actions: respond');
  });

  it('TC-5.3c failed process is not presented as completed', () => {
    const view = renderProcessSection({
      envelope: processSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [failedProcessFixture],
      }),
      selectedProcessId: null,
      targetDocument: document,
    });

    expect(view.textContent).toContain('Failed');
    expect(view.textContent).not.toContain('Completed');
    expect(view.textContent).toContain('Available actions: review, restart');
  });
});

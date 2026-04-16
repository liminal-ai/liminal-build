// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { buildProcessSurfaceSummary } from '../../../apps/platform/server/services/processes/process-work-surface.service.js';
import { renderProcessControls } from '../../../apps/platform/client/features/processes/process-controls.js';
import { buildEnvironmentSummaryFixture } from '../../fixtures/process-environment.js';
import { pausedProcessFixture } from '../../fixtures/processes.js';
import {
  checkpointingEnvironmentProcessControlsFixture,
  failedProcessControlsFixture,
  lostEnvironmentProcessControlsFixture,
  preparingEnvironmentProcessControlsFixture,
  readyEnvironmentProcessControlsFixture,
  rebuildingEnvironmentProcessControlsFixture,
  runningProcessControlsFixture,
  stableProcessControlOrderFixture,
  staleEnvironmentProcessControlsFixture,
  unavailableEnvironmentProcessControlsFixture,
} from '../../fixtures/process-controls.js';

function renderControls(controls: Parameters<typeof renderProcessControls>[0]['controls']) {
  return renderProcessControls({
    controls,
    targetDocument: document,
    onAction: vi.fn(),
  });
}

function getControlButton(view: HTMLElement, actionId: string) {
  return view.querySelector(
    `[data-process-control="${actionId}"] button`,
  ) as HTMLButtonElement | null;
}

describe('process controls', () => {
  it('TC-1.2a stable control set remains visible in a stable order', () => {
    const view = renderControls(readyEnvironmentProcessControlsFixture);

    expect(
      [...view.querySelectorAll('[data-process-control]')].map((item) =>
        item.getAttribute('data-process-control'),
      ),
    ).toEqual(stableProcessControlOrderFixture);
  });

  it('TC-1.2b disabled controls remain visible', () => {
    const view = renderControls(readyEnvironmentProcessControlsFixture);

    expect(getControlButton(view, 'rehydrate')).not.toBeNull();
    expect(getControlButton(view, 'rebuild')).not.toBeNull();
    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(true);
    expect(getControlButton(view, 'rebuild')?.disabled).toBe(true);
  });

  it('TC-1.3a disabled reason shown for blocked environment action', () => {
    const view = renderControls(staleEnvironmentProcessControlsFixture);

    expect(
      view.querySelector('[data-process-control-disabled-reason="rebuild"]')?.textContent,
    ).toContain('Rebuild is only available after the environment is lost or unrecoverable.');
  });

  it('TC-1.3b disabled reason shown for blocked process action', () => {
    const view = renderControls(preparingEnvironmentProcessControlsFixture);

    expect(view.querySelector('[data-process-control-disabled-reason="start"]')?.textContent).toBe(
      'Start is unavailable while the environment is preparing.',
    );
  });

  it('TC-1.1c preparing state keeps lifecycle controls visible but disabled', () => {
    const view = renderControls(preparingEnvironmentProcessControlsFixture);

    expect(getControlButton(view, 'start')?.disabled).toBe(true);
    expect(getControlButton(view, 'resume')?.disabled).toBe(true);
    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(true);
    expect(getControlButton(view, 'rebuild')?.disabled).toBe(true);
    expect(getControlButton(view, 'restart')?.disabled).toBe(true);
  });

  it('TC-1.1d ready state keeps recovery controls disabled', () => {
    const view = renderControls(readyEnvironmentProcessControlsFixture);

    expect(getControlButton(view, 'start')?.disabled).toBe(false);
    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(true);
    expect(getControlButton(view, 'rebuild')?.disabled).toBe(true);
  });

  it('TC-1.1e running state disables recovery controls during active execution', () => {
    const view = renderControls(runningProcessControlsFixture);

    expect(getControlButton(view, 'review')?.disabled).toBe(false);
    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(true);
    expect(getControlButton(view, 'rebuild')?.disabled).toBe(true);
    expect(getControlButton(view, 'restart')?.disabled).toBe(true);
  });

  it('TC-1.1f checkpointing state disables lifecycle controls while work settles', () => {
    const view = renderControls(checkpointingEnvironmentProcessControlsFixture);

    expect(getControlButton(view, 'start')?.disabled).toBe(true);
    expect(getControlButton(view, 'resume')?.disabled).toBe(true);
    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(true);
    expect(getControlButton(view, 'rebuild')?.disabled).toBe(true);
    expect(getControlButton(view, 'restart')?.disabled).toBe(true);
  });

  it('TC-1.1g stale state enables rehydrate and explains unavailable rebuild path', () => {
    const view = renderControls(staleEnvironmentProcessControlsFixture);

    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(false);
    expect(getControlButton(view, 'rebuild')?.disabled).toBe(true);
  });

  it('TC-1.1h lost state enables rebuild and explains disabled rehydrate path', () => {
    const view = renderControls(lostEnvironmentProcessControlsFixture);

    expect(getControlButton(view, 'rebuild')?.disabled).toBe(false);
    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(true);
  });

  it('TC-1.1i failed state shows only valid recovery actions', () => {
    const view = renderControls(failedProcessControlsFixture);

    expect(getControlButton(view, 'start')?.disabled).toBe(true);
    expect(getControlButton(view, 'resume')?.disabled).toBe(true);
    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(false);
    expect(getControlButton(view, 'rebuild')?.disabled).toBe(false);
    expect(getControlButton(view, 'restart')?.disabled).toBe(false);
  });

  it('TC-1.1j rebuilding state disables lifecycle controls during rebuild', () => {
    const view = renderControls(rebuildingEnvironmentProcessControlsFixture);

    expect(getControlButton(view, 'start')?.disabled).toBe(true);
    expect(getControlButton(view, 'resume')?.disabled).toBe(true);
    expect(getControlButton(view, 'rehydrate')?.disabled).toBe(true);
    expect(getControlButton(view, 'rebuild')?.disabled).toBe(true);
    expect(getControlButton(view, 'restart')?.disabled).toBe(true);
  });

  it('TC-1.1k unavailable state keeps controls visible and explains blocked environment actions', () => {
    const view = renderControls(unavailableEnvironmentProcessControlsFixture);

    expect(getControlButton(view, 'start')).not.toBeNull();
    expect(getControlButton(view, 'resume')).not.toBeNull();
    expect(getControlButton(view, 'rehydrate')).not.toBeNull();
    expect(getControlButton(view, 'rebuild')).not.toBeNull();
    expect(
      view.querySelector('[data-process-control-disabled-reason="rehydrate"]')?.textContent,
    ).toBe('Environment lifecycle work is currently unavailable.');
  });

  it('recovery controls distinguish rehydrating from generic preparing state', () => {
    const summary = buildProcessSurfaceSummary(
      pausedProcessFixture,
      buildEnvironmentSummaryFixture({
        environmentId: 'environment-rehydrating-controls-001',
        state: 'rehydrating',
        statusLabel: 'Rehydrating environment',
        blockedReason: 'Rehydrate is in progress.',
      }),
    );
    const view = renderControls(summary.controls);

    expect(view.querySelector('[data-process-control-disabled-reason="resume"]')?.textContent).toBe(
      'Resume is unavailable while the environment is rehydrating.',
    );
    expect(
      view.querySelector('[data-process-control-disabled-reason="rehydrate"]')?.textContent,
    ).toBe('Rehydrate is already in progress.');
    expect(
      view.querySelector('[data-process-control-disabled-reason="rebuild"]')?.textContent,
    ).toBe('Rebuild is unavailable while the environment is rehydrating.');
  });
});

import { describe, expect, it } from 'vitest';
import { buildProcessSurfaceSummary } from '../../../apps/platform/server/services/processes/process-work-surface.service.js';
import {
  processSurfaceControlOrder,
  requestErrorSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  artifactCheckpointFailureFixture,
  codeCheckpointSuccessFixture,
} from '../../fixtures/checkpoint-results.js';
import {
  lostEnvironmentProcessControlsFixture,
  stableProcessControlOrderFixture,
  staleEnvironmentProcessControlsFixture,
} from '../../fixtures/process-controls.js';
import { readyProcessWorkSurfaceFixture } from '../../fixtures/process-surface.js';
import { waitingProcessFixture } from '../../fixtures/processes.js';
import { mixedAccessProcessMaterialsFixture } from '../../fixtures/materials.js';

describe('Epic 03 Story 0 foundation contracts', () => {
  it('builds a stable visible control set from currently enabled process actions', () => {
    const summary = buildProcessSurfaceSummary(waitingProcessFixture);

    expect(processSurfaceControlOrder).toEqual(stableProcessControlOrderFixture);
    expect(summary.controls.map((control) => control.actionId)).toEqual(
      stableProcessControlOrderFixture,
    );
    expect(summary.controls.find((control) => control.actionId === 'respond')).toMatchObject({
      enabled: true,
      label: 'Respond',
    });
    expect(summary.controls.find((control) => control.actionId === 'rehydrate')).toMatchObject({
      enabled: false,
    });
  });

  it('fixtures cover checkpoint, environment, and mixed source-access vocabulary', () => {
    expect(readyProcessWorkSurfaceFixture.environment).toMatchObject({
      state: 'absent',
      lastCheckpointResult: null,
    });
    expect(
      mixedAccessProcessMaterialsFixture.currentSources.map((source) => source.accessMode),
    ).toEqual(['read_only', 'read_write']);
    expect(codeCheckpointSuccessFixture).toMatchObject({
      checkpointKind: 'code',
      outcome: 'succeeded',
    });
    expect(artifactCheckpointFailureFixture).toMatchObject({
      checkpointKind: 'artifact',
      outcome: 'failed',
    });
  });

  it('shared control fixtures preserve disabled reasons for recovery paths', () => {
    expect(
      staleEnvironmentProcessControlsFixture.find((control) => control.actionId === 'rebuild'),
    ).toMatchObject({
      enabled: false,
      disabledReason: 'Rebuild is only available after the environment is lost or unrecoverable.',
    });
    expect(
      lostEnvironmentProcessControlsFixture.find((control) => control.actionId === 'rehydrate'),
    ).toMatchObject({
      enabled: false,
      disabledReason: 'Rehydrate is unavailable because no recoverable working copy remains.',
    });
  });

  it('request errors accept the Epic 03 environment recovery codes', () => {
    expect(
      requestErrorSchema.parse({
        code: 'PROCESS_ENVIRONMENT_NOT_RECOVERABLE',
        message: 'Rehydrate is not possible for this environment.',
        status: 409,
      }),
    ).toMatchObject({
      code: 'PROCESS_ENVIRONMENT_NOT_RECOVERABLE',
      status: 409,
    });
    expect(
      requestErrorSchema.parse({
        code: 'PROCESS_ENVIRONMENT_PREREQUISITE_MISSING',
        message: 'Canonical materials are missing.',
        status: 422,
      }),
    ).toMatchObject({
      code: 'PROCESS_ENVIRONMENT_PREREQUISITE_MISSING',
      status: 422,
    });
    expect(
      requestErrorSchema.parse({
        code: 'PROCESS_ENVIRONMENT_UNAVAILABLE',
        message: 'Environment lifecycle work is unavailable.',
        status: 503,
      }),
    ).toMatchObject({
      code: 'PROCESS_ENVIRONMENT_UNAVAILABLE',
      status: 503,
    });
  });
});

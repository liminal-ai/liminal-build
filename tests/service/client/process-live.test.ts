import { describe, expect, it } from 'vitest';
import { applyLiveProcessMessage } from '../../../apps/platform/client/app/process-live.js';
import { liveProcessUpdateMessageSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  connectedProcessSurfaceStateFixture,
  processSnapshotLiveFixture,
} from '../../fixtures/live-process.js';
import { runningProcessSurfaceFixture } from '../../fixtures/process-surface.js';

describe('process live foundation', () => {
  it('rejects process messages whose top-level process id differs from the payload process id', () => {
    expect(() =>
      liveProcessUpdateMessageSchema.parse({
        ...processSnapshotLiveFixture,
        processId: connectedProcessSurfaceStateFixture.processId,
        entityId: connectedProcessSurfaceStateFixture.processId,
        payload: runningProcessSurfaceFixture,
      }),
    ).toThrow(/payload\.processId/i);
  });

  it('ignores process messages for another process surface', () => {
    const crossProcessMessage = liveProcessUpdateMessageSchema.parse({
      ...processSnapshotLiveFixture,
      processId: runningProcessSurfaceFixture.processId,
      entityId: runningProcessSurfaceFixture.processId,
      payload: runningProcessSurfaceFixture,
    });

    const nextState = applyLiveProcessMessage({
      state: connectedProcessSurfaceStateFixture,
      message: crossProcessMessage,
    });

    expect(nextState).toBe(connectedProcessSurfaceStateFixture);
  });
});

import { describe, expect, it } from 'vitest';
import { AppError } from '../../../apps/platform/server/errors/app-error.js';
import { DaytonaProviderAdapter } from '../../../apps/platform/server/services/processes/environment/daytona-provider-adapter.js';

const expectNotImplemented = async (call: () => Promise<unknown>): Promise<void> => {
  let caught: unknown;
  try {
    await call();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AppError);
  expect((caught as AppError).code).toBe('NOT_IMPLEMENTED');
  expect((caught as AppError).statusCode).toBe(503);
  expect((caught as AppError).message).toContain('Daytona provider not implemented yet');
};

describe('DaytonaProviderAdapter (typed skeleton)', () => {
  const adapter = new DaytonaProviderAdapter();
  const samplePlan = {
    fingerprint: 'fp',
    artifactInputs: [],
    outputInputs: [],
    sourceInputs: [],
  };

  it('exposes providerKind = daytona so the registry can resolve it', () => {
    expect(adapter.providerKind).toBe('daytona');
  });

  it('throws NOT_IMPLEMENTED for ensureEnvironment', async () => {
    await expectNotImplemented(() =>
      adapter.ensureEnvironment({ processId: 'proc-1', providerKind: 'daytona' }),
    );
  });

  it('throws NOT_IMPLEMENTED for hydrateEnvironment', async () => {
    await expectNotImplemented(() =>
      adapter.hydrateEnvironment({ environmentId: 'env-1', plan: samplePlan }),
    );
  });

  it('throws NOT_IMPLEMENTED for executeScript', async () => {
    await expectNotImplemented(() =>
      adapter.executeScript({
        environmentId: 'env-1',
        scriptPayload: { format: 'ts-module-source', entrypoint: 'default', source: '' },
      }),
    );
  });

  it('throws NOT_IMPLEMENTED for rehydrateEnvironment', async () => {
    await expectNotImplemented(() =>
      adapter.rehydrateEnvironment({ environmentId: 'env-1', plan: samplePlan }),
    );
  });

  it('throws NOT_IMPLEMENTED for rebuildEnvironment', async () => {
    await expectNotImplemented(() =>
      adapter.rebuildEnvironment({
        processId: 'proc-1',
        providerKind: 'daytona',
        plan: samplePlan,
      }),
    );
  });

  it('throws NOT_IMPLEMENTED for teardownEnvironment', async () => {
    await expectNotImplemented(() => adapter.teardownEnvironment({ environmentId: 'env-1' }));
  });
});

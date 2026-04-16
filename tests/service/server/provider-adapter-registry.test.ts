import { describe, expect, it } from 'vitest';
import { AppError } from '../../../apps/platform/server/errors/app-error.js';
import { DaytonaProviderAdapter } from '../../../apps/platform/server/services/processes/environment/daytona-provider-adapter.js';
import {
  DefaultProviderAdapterRegistry,
  SingleAdapterRegistry,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter-registry.js';
import {
  FailingProviderAdapter,
  InMemoryProviderAdapter,
  type ProviderAdapter,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';

describe('DefaultProviderAdapterRegistry', () => {
  it('resolves a registered local adapter by providerKind', () => {
    const local = new InMemoryProviderAdapter();
    const daytona = new DaytonaProviderAdapter();
    const registry = new DefaultProviderAdapterRegistry([local, daytona]);

    expect(registry.resolve('local')).toBe(local);
  });

  it('resolves a registered daytona adapter by providerKind', () => {
    const local = new InMemoryProviderAdapter();
    const daytona = new DaytonaProviderAdapter();
    const registry = new DefaultProviderAdapterRegistry([local, daytona]);

    expect(registry.resolve('daytona')).toBe(daytona);
  });

  it('throws AppError 503 when the requested providerKind is not registered', () => {
    const registry = new DefaultProviderAdapterRegistry([new InMemoryProviderAdapter()]);

    let caught: unknown;
    try {
      registry.resolve('daytona');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('PROVIDER_KIND_NOT_REGISTERED');
    expect((caught as AppError).statusCode).toBe(503);
  });
});

describe('SingleAdapterRegistry', () => {
  it('returns the supplied adapter for any providerKind', () => {
    const adapter: ProviderAdapter = new FailingProviderAdapter('test');
    const registry = new SingleAdapterRegistry(adapter);

    expect(registry.resolve('local')).toBe(adapter);
    expect(registry.resolve('daytona')).toBe(adapter);
  });
});

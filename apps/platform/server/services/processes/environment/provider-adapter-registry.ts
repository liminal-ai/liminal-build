import { AppError } from '../../../errors/app-error.js';
import type { ProviderAdapter, ProviderKind } from './provider-adapter.js';

export interface ProviderAdapterRegistry {
  resolve(providerKind: ProviderKind): ProviderAdapter;
}

/**
 * Default registry that resolves a `ProviderAdapter` by `providerKind`.
 *
 * Construction takes the available adapters keyed by their `providerKind`.
 * Resolving an unknown kind throws `PROVIDER_KIND_NOT_REGISTERED` so the
 * caller can surface a 503 / unavailable state.
 */
export class DefaultProviderAdapterRegistry implements ProviderAdapterRegistry {
  private readonly adaptersByKind: Map<ProviderKind, ProviderAdapter>;

  constructor(adapters: ProviderAdapter[]) {
    this.adaptersByKind = new Map(adapters.map((adapter) => [adapter.providerKind, adapter]));
  }

  resolve(providerKind: ProviderKind): ProviderAdapter {
    const adapter = this.adaptersByKind.get(providerKind);

    if (adapter === undefined) {
      throw new AppError({
        code: 'PROVIDER_KIND_NOT_REGISTERED',
        message: `No provider adapter is registered for providerKind '${providerKind}'.`,
        statusCode: 503,
      });
    }

    return adapter;
  }
}

/**
 * Test-only registry that returns the same adapter for every `providerKind`.
 * Lets the legacy `options.providerAdapter` test seam continue to work after
 * the production wiring switches to the registry.
 */
export class SingleAdapterRegistry implements ProviderAdapterRegistry {
  constructor(private readonly adapter: ProviderAdapter) {}

  resolve(_providerKind: ProviderKind): ProviderAdapter {
    return this.adapter;
  }
}

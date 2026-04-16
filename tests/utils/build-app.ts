import { type CreateAppOptions, createApp } from '../../apps/platform/server/app.js';
import { type ServerEnv, story0PlaceholderEnv } from '../../apps/platform/server/config.js';
import { StubCodeCheckpointWriter } from '../../apps/platform/server/services/processes/environment/code-checkpoint-writer.js';
import { InMemoryProviderAdapter } from '../../apps/platform/server/services/processes/environment/provider-adapter.js';

export async function buildApp(
  overrides: Omit<CreateAppOptions, 'env'> & { env?: Partial<ServerEnv> } = {},
) {
  const env = {
    ...story0PlaceholderEnv,
    ...overrides.env,
  };

  // Test default: `InMemoryProviderAdapter`. Production `createApp` defaults to
  // `LocalProviderAdapter` + `DaytonaProviderAdapter` skeleton, but service-level
  // tests want a deterministic in-memory fake that does not spawn child
  // processes or touch the filesystem. Tests that need a different fake (e.g.,
  // `FailingProviderAdapter`) supply `providerAdapter` explicitly.
  const providerAdapter = overrides.providerAdapter ?? new InMemoryProviderAdapter();

  // Test default: `StubCodeCheckpointWriter`. Production `createApp` defaults
  // to `OctokitCodeCheckpointWriter`, which would attempt real GitHub writes
  // using `env.GITHUB_TOKEN` — fine in `index.ts` boot, not what the unit and
  // service tests want. Tests that exercise the failed-checkpoint path supply
  // `FailingCodeCheckpointWriter` explicitly via `codeCheckpointWriter`.
  const codeCheckpointWriter = overrides.codeCheckpointWriter ?? new StubCodeCheckpointWriter();

  return createApp({
    ...overrides,
    providerAdapter,
    codeCheckpointWriter,
    env,
    logger: overrides.logger ?? false,
  });
}

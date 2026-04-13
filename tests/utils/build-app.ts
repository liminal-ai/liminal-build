import { type CreateAppOptions, createApp } from '../../apps/platform/server/app.js';
import { type ServerEnv, story0PlaceholderEnv } from '../../apps/platform/server/config.js';

export async function buildApp(
  overrides: Omit<CreateAppOptions, 'env'> & { env?: Partial<ServerEnv> } = {},
) {
  const env = {
    ...story0PlaceholderEnv,
    ...overrides.env,
  };

  return createApp({
    ...overrides,
    env,
    logger: overrides.logger ?? false,
  });
}

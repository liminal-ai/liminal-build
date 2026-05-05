import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../utils/build-app.js';

describe('app startup warnings', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails fast in production when review boot would fall back to NullPlatformStore', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(buildApp()).rejects.toThrow(
      'createApp cannot boot with NullPlatformStore in production.',
    );
  });
});

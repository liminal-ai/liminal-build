import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { buildApp } from '../../utils/build-app.js';

type LogRecord = Record<string, unknown>;

function createLogCapture() {
  const records: LogRecord[] = [];

  return {
    records,
    logger: {
      level: 'trace',
      stream: {
        write(line: string) {
          records.push(JSON.parse(line) as LogRecord);
        },
      },
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('server startup adapter validation', () => {
  it('fails fast in production when NullPlatformStore would be used', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(
      buildApp({
        env: {
          CONVEX_URL: 'https://story0.example.convex.cloud',
        },
      }),
    ).rejects.toThrow('createApp cannot boot with NullPlatformStore in production.');
  });

  it('still warns in production when a non-shared live hub is active on an explicit durable store', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const logs = createLogCapture();
    const app = await buildApp({
      logger: logs.logger,
      platformStore: new InMemoryPlatformStore(),
    });

    try {
      expect(logs.records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Process live hub is InMemoryProcessLiveHub -- live updates stay in-process only. Configure a shared live hub before running in production.',
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });
});

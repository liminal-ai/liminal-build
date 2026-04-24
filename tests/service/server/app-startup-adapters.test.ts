import { afterEach, describe, expect, it, vi } from 'vitest';
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
  it('warns in production when null or in-memory adapters are active', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const logs = createLogCapture();
    const app = await buildApp({
      logger: logs.logger,
      env: {
        CONVEX_URL: 'https://story0.example.convex.cloud',
      },
    });

    try {
      expect(logs.records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Platform store is NullPlatformStore -- review features will return empty results. Set CONVEX_URL to enable live data.',
          }),
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

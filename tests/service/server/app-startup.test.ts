import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../utils/build-app.js';

describe('app startup warnings', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('warns in production when review boot falls back to null or in-memory adapters', async () => {
    const records: Array<Record<string, unknown>> = [];
    vi.stubEnv('NODE_ENV', 'production');

    const app = await buildApp({
      logger: {
        level: 'warn',
        stream: {
          write(line: string) {
            records.push(JSON.parse(line) as Record<string, unknown>);
          },
        },
      },
    });

    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 40,
          msg: expect.stringContaining('Platform store is NullPlatformStore'),
        }),
        expect.objectContaining({
          level: 40,
          msg: expect.stringContaining('Process live hub is InMemoryProcessLiveHub'),
        }),
      ]),
    );

    await app.close();
  });
});

import { ConvexHttpClient } from 'convex/browser';
import { describe, expect, it, vi } from 'vitest';
import { ConvexPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';

const FUNCTION_NAME_SYMBOL = Symbol.for('functionName');

function readFunctionName(ref: unknown): string | undefined {
  if (ref === null || typeof ref !== 'object') {
    return undefined;
  }

  const direct = (ref as Record<symbol, unknown>)[FUNCTION_NAME_SYMBOL];
  if (typeof direct === 'string') {
    return direct;
  }

  for (const symbol of Object.getOwnPropertySymbols(ref)) {
    if (symbol.description === 'functionName') {
      const value = (ref as Record<symbol, unknown>)[symbol];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return undefined;
}

describe('ConvexPlatformStore service API key transport', () => {
  it('uses the public checkpoint wrapper and forwards the configured api key without calling setAdminAuth', async () => {
    const actionSpy = vi.spyOn(ConvexHttpClient.prototype, 'action').mockResolvedValueOnce([]);
    const adminAuthCapableProto = ConvexHttpClient.prototype as unknown as {
      setAdminAuth?: (token: string) => void;
    };
    const setAdminAuthSpy =
      adminAuthCapableProto.setAdminAuth === undefined
        ? null
        : vi.spyOn(adminAuthCapableProto, 'setAdminAuth').mockImplementation(() => {});

    try {
      const apiKey = 'test-convex-api-key';
      const store = new ConvexPlatformStore('https://test.example.convex.cloud', apiKey);

      await store.persistCheckpointArtifacts({
        processId: 'process-123',
        artifacts: [
          {
            artifactId: 'artifact-123',
            producedAt: '2026-04-17T12:00:00.000Z',
            contents: 'artifact body',
            targetLabel: 'Artifact',
          },
        ],
      });

      expect(actionSpy).toHaveBeenCalledTimes(1);
      const [ref, args] = actionSpy.mock.calls[0] ?? [];
      expect(readFunctionName(ref)).toBe('artifacts:persistCheckpointArtifactsForService');
      expect(args).toMatchObject({
        apiKey,
        processId: 'process-123',
        artifacts: [
          {
            artifactId: 'artifact-123',
            producedAt: '2026-04-17T12:00:00.000Z',
            contents: 'artifact body',
            targetLabel: 'Artifact',
          },
        ],
      });
      expect(setAdminAuthSpy).not.toHaveBeenCalled();
    } finally {
      actionSpy.mockRestore();
      setAdminAuthSpy?.mockRestore();
    }
  });

  it('uses the public artifact-content wrapper and forwards the configured api key without calling setAdminAuth', async () => {
    const actionSpy = vi
      .spyOn(ConvexHttpClient.prototype, 'action')
      .mockResolvedValueOnce('artifact body');
    const adminAuthCapableProto = ConvexHttpClient.prototype as unknown as {
      setAdminAuth?: (token: string) => void;
    };
    const setAdminAuthSpy =
      adminAuthCapableProto.setAdminAuth === undefined
        ? null
        : vi.spyOn(adminAuthCapableProto, 'setAdminAuth').mockImplementation(() => {});

    try {
      const apiKey = 'test-convex-api-key';
      const store = new ConvexPlatformStore('https://test.example.convex.cloud', apiKey);

      await expect(store.getArtifactContent({ artifactId: 'artifact-456' })).resolves.toBe(
        'artifact body',
      );

      expect(actionSpy).toHaveBeenCalledTimes(1);
      const [ref, args] = actionSpy.mock.calls[0] ?? [];
      expect(readFunctionName(ref)).toBe('artifacts:fetchArtifactContentForService');
      expect(args).toMatchObject({
        apiKey,
        artifactId: 'artifact-456',
      });
      expect(setAdminAuthSpy).not.toHaveBeenCalled();
    } finally {
      actionSpy.mockRestore();
      setAdminAuthSpy?.mockRestore();
    }
  });
});

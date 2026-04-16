import { ConvexHttpClient } from 'convex/browser';
import { describe, expect, it, vi } from 'vitest';
import { ConvexPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';

describe('ConvexPlatformStore admin auth wiring', () => {
  it('calls setAdminAuth on the underlying ConvexHttpClient with the configured deploy key', () => {
    // Spy on the prototype so we can observe the call without making any HTTP
    // requests. The constructor must call setAdminAuth so internal* function
    // calls (e.g. artifacts:persistCheckpointArtifacts) are authorized.
    // `setAdminAuth` is `@internal` in Convex's public types, so narrow the
    // prototype cast to just the method under test.
    const adminAuthCapableProto = ConvexHttpClient.prototype as unknown as {
      setAdminAuth(token: string): void;
    };
    const setAdminAuthSpy = vi
      .spyOn(adminAuthCapableProto, 'setAdminAuth')
      .mockImplementation(() => {});

    try {
      const deployKey = 'test-deploy-key-abcd-1234';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _store = new ConvexPlatformStore('https://test.example.convex.cloud', deployKey);

      expect(setAdminAuthSpy).toHaveBeenCalledTimes(1);
      expect(setAdminAuthSpy).toHaveBeenCalledWith(deployKey);
    } finally {
      setAdminAuthSpy.mockRestore();
    }
  });
});

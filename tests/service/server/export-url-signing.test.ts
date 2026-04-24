import { describe, expect, it } from 'vitest';
import { HmacExportUrlSigner } from '../../../apps/platform/server/services/review/export-url-signing.js';

describe('export url signing', () => {
  it('round-trips valid export payloads', () => {
    const signer = new HmacExportUrlSigner(
      'story0-review-export-hmac-secret-placeholder',
      () => new Date('2026-04-23T12:00:00.000Z'),
    );
    const token = signer.mint({
      exportId: 'export-001',
      packageSnapshotId: 'package-001',
      actorId: 'user-001',
      expiresAt: '2026-04-23T12:15:00.000Z',
    });

    expect(signer.verify(token)).toEqual({
      valid: true,
      payload: {
        exportId: 'export-001',
        packageSnapshotId: 'package-001',
        actorId: 'user-001',
        expiresAt: '2026-04-23T12:15:00.000Z',
      },
    });
  });

  it('rejects expired or tampered tokens', () => {
    const signer = new HmacExportUrlSigner(
      'story0-review-export-hmac-secret-placeholder',
      () => new Date('2026-04-23T12:30:00.000Z'),
    );
    const token = signer.mint({
      exportId: 'export-001',
      packageSnapshotId: 'package-001',
      actorId: 'user-001',
      expiresAt: '2026-04-23T12:15:00.000Z',
    });

    expect(signer.verify(token)).toEqual({
      valid: false,
      reason: 'expired',
      payload: {
        exportId: 'export-001',
        packageSnapshotId: 'package-001',
        actorId: 'user-001',
        expiresAt: '2026-04-23T12:15:00.000Z',
      },
    });
    expect(signer.verify(`${token}tampered`)).toEqual({
      valid: false,
      reason: 'invalid_signature',
      payload: {
        exportId: 'export-001',
        packageSnapshotId: 'package-001',
        actorId: 'user-001',
        expiresAt: '2026-04-23T12:15:00.000Z',
      },
    });
  });
});

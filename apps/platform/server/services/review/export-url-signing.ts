import { createHmac, timingSafeEqual } from 'node:crypto';

export interface ExportTokenPayload {
  exportId: string;
  packageSnapshotId: string;
  actorId: string;
  expiresAt: string;
}

export interface ExportUrlSigner {
  mint(payload: ExportTokenPayload): string;
  verify(token: string): ExportTokenVerification;
}

export type ExportTokenVerification =
  | {
      valid: true;
      payload: ExportTokenPayload;
    }
  | {
      valid: false;
      reason: 'malformed' | 'invalid_payload' | 'invalid_signature' | 'expired' | 'invalid_expiry';
      payload?: ExportTokenPayload;
    };

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export function inspectExportTokenPayload(token: string): ExportTokenPayload | undefined {
  const separatorIndex = token.indexOf('.');
  if (separatorIndex <= 0) {
    return undefined;
  }

  const decodedPayload = decodeBase64Url(token.slice(0, separatorIndex));
  if (decodedPayload === null) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(decodedPayload) as ExportTokenPayload;
    if (
      typeof parsed.exportId !== 'string' ||
      typeof parsed.packageSnapshotId !== 'string' ||
      typeof parsed.actorId !== 'string' ||
      typeof parsed.expiresAt !== 'string'
    ) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

export class HmacExportUrlSigner implements ExportUrlSigner {
  constructor(
    private readonly secret: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  mint(payload: ExportTokenPayload): string {
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = createHmac('sha256', this.secret).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  verify(token: string): ExportTokenVerification {
    const separatorIndex = token.indexOf('.');
    if (separatorIndex <= 0) {
      return { valid: false, reason: 'malformed' };
    }

    const encodedPayload = token.slice(0, separatorIndex);
    const encodedSignature = token.slice(separatorIndex + 1);
    const payload = inspectExportTokenPayload(token);
    if (encodedSignature.length === 0) {
      return { valid: false, reason: 'malformed', payload };
    }

    const expectedSignature = createHmac('sha256', this.secret)
      .update(encodedPayload)
      .digest('base64url');

    const provided = Buffer.from(encodedSignature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (provided.byteLength !== expected.byteLength || !timingSafeEqual(provided, expected)) {
      return { valid: false, reason: 'invalid_signature', payload };
    }

    if (payload === undefined) {
      return { valid: false, reason: 'invalid_payload' };
    }

    const expiresAt = Date.parse(payload.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return { valid: false, reason: 'invalid_expiry', payload };
    }

    if (expiresAt <= this.now().getTime()) {
      return { valid: false, reason: 'expired', payload };
    }

    return { valid: true, payload };
  }
}

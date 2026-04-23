export const packageErrorCodes = ['NOT_IMPLEMENTED', 'INVALID_MANIFEST'] as const;
export type PackageErrorCode = (typeof packageErrorCodes)[number];

export class PackageError extends Error {
  constructor(
    public readonly code: PackageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PackageError';
  }
}

export const packageErrorCodes = [
  'NOT_IMPLEMENTED',
  'INVALID_MANIFEST',
  'INVALID_ENTRY_NAME',
  'INVALID_ARCHIVE',
  'ENTRY_TOO_LARGE',
  'ARCHIVE_TOO_LARGE',
  'READ_ERROR',
  'COMPRESSION_ERROR',
] as const;
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

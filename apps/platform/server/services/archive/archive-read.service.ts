import type { ArchivePage } from '../../../shared/contracts/index.js';
import { archivePageSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { invalidArchiveRequestErrorCode } from '../../errors/codes.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { ProcessAccessService } from '../processes/process-access.service.js';
import type { PlatformStore } from '../projects/platform-store.js';

const DEFAULT_ARCHIVE_PAGE_LIMIT = 100;
const MAX_ARCHIVE_PAGE_LIMIT = 200;

export interface ArchiveReadService {
  getArchive(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    cursor?: string | null;
    limit?: number;
  }): Promise<ArchivePage>;
}

export class DefaultArchiveReadService implements ArchiveReadService {
  constructor(
    private readonly platformStore: Pick<PlatformStore, 'listArchiveEntries'>,
    private readonly processAccessService: Pick<ProcessAccessService, 'assertProcessAccess'>,
  ) {}

  async getArchive(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    cursor?: string | null;
    limit?: number;
  }): Promise<ArchivePage> {
    await this.processAccessService.assertProcessAccess({
      actor: args.actor,
      projectId: args.projectId,
      processId: args.processId,
    });

    const cursor = normalizeArchiveCursor(args.cursor);
    const limit = normalizeArchiveLimit(args.limit);
    const page = await this.platformStore.listArchiveEntries({
      processId: args.processId,
      cursor,
      limit,
    });

    return archivePageSchema.parse(page);
  }
}

function normalizeArchiveCursor(cursor: string | null | undefined): string | null {
  if (cursor === undefined || cursor === null) {
    return null;
  }

  if (!/^\d+$/.test(cursor)) {
    throw new AppError({
      code: invalidArchiveRequestErrorCode,
      message: 'Archive pagination parameters were invalid.',
      statusCode: 422,
    });
  }

  return cursor;
}

function normalizeArchiveLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_ARCHIVE_PAGE_LIMIT;
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_ARCHIVE_PAGE_LIMIT) {
    throw new AppError({
      code: invalidArchiveRequestErrorCode,
      message: 'Archive pagination parameters were invalid.',
      statusCode: 422,
    });
  }

  return limit;
}

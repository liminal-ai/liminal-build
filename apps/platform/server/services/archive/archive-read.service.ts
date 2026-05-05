import type { ArchivePage } from '../../../shared/contracts/index.js';
import { archivePageSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { invalidArchiveRequestErrorCode } from '../../errors/codes.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { ProcessAccessService } from '../processes/process-access.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import type { SourceProvenanceService } from '../sources/source-provenance.service.js';
import { enrichArchiveEntries } from './archive-entry-enrichment.js';

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
    private readonly platformStore: Pick<
      PlatformStore,
      'getArtifactVersion' | 'listArchiveEntries'
    > & {
      listProcessesByIds?: PlatformStore['listProcessesByIds'];
    },
    private readonly processAccessService: Pick<ProcessAccessService, 'assertProcessAccess'>,
    private readonly sourceProvenanceService?: Pick<
      SourceProvenanceService,
      'listProcessSourceProvenance'
    >,
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
    const entries = await enrichArchiveEntries({
      entries: page.entries,
      projectId: args.projectId,
      platformStore: this.platformStore,
      processId: args.processId,
      sourceProvenanceService: this.sourceProvenanceService,
    });

    return archivePageSchema.parse({
      ...page,
      entries,
    });
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

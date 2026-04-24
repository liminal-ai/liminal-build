import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { createPackageFromEntries } from '@liminal-build/markdown-package';
import {
  buildReviewExportDownloadApiPath,
  exportPackageResponseSchema,
  type ExportPackageResponse,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import {
  reviewExportFailedErrorCode,
  reviewExportNotAvailableErrorCode,
  reviewTargetNotFoundErrorCode,
} from '../../errors/codes.js';
import type {
  ArtifactVersionRecord,
  PackageSnapshotMemberRecord,
  PackageSnapshotRecord,
  PlatformStore,
} from '../projects/platform-store.js';
import type { ExportUrlSigner } from './export-url-signing.js';

const EXPORT_URL_LIFETIME_MS = 15 * 60 * 1000;

type ExportablePackageMember = PackageSnapshotMemberRecord & {
  artifactVersion: ArtifactVersionRecord;
};

function buildExportNotFoundError(): AppError {
  return new AppError({
    code: reviewTargetNotFoundErrorCode,
    message: 'The requested review target could not be found.',
    statusCode: 404,
  });
}

function buildExportNotAvailableError(message: string): AppError {
  return new AppError({
    code: reviewExportNotAvailableErrorCode,
    message,
    statusCode: 409,
  });
}

function buildExportFailedError(message: string): AppError {
  return new AppError({
    code: reviewExportFailedErrorCode,
    message,
    statusCode: 503,
  });
}

function sanitizeDownloadBaseName(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'package-export';
}

function buildMemberArchivePath(args: { displayName: string; position: number }): string {
  const baseName = sanitizeDownloadBaseName(args.displayName);
  return `${args.position + 1}-${baseName}.md`;
}

async function readExportableMembers(
  platformStore: PlatformStore,
  snapshot: PackageSnapshotRecord,
): Promise<ExportablePackageMember[]> {
  const members = await platformStore.listPackageSnapshotMembers({
    packageSnapshotId: snapshot.packageSnapshotId,
  });

  if (members.length === 0) {
    throw buildExportNotFoundError();
  }

  const exportableMembers: ExportablePackageMember[] = [];
  for (const member of members) {
    const artifactVersion = await platformStore.getArtifactVersion({
      versionId: member.artifactVersionId,
    });

    if (artifactVersion === null) {
      throw buildExportNotAvailableError('One or more package members are unavailable.');
    }

    if (artifactVersion.contentKind !== 'markdown') {
      throw buildExportNotAvailableError('One or more package members are not exportable.');
    }

    exportableMembers.push({
      ...member,
      artifactVersion,
    });
  }

  return exportableMembers.sort((left, right) => left.position - right.position);
}

export interface ExportRequestArgs {
  projectId: string;
  processId: string;
  packageId: string;
  actorId: string;
}

export interface DownloadExportArgs {
  projectId: string;
  processId: string;
  exportId: string;
  token: string;
  actorId: string;
}

export type ExportDownloadResult = {
  downloadName: string;
  packageId: string;
  stream: Readable;
};

export interface ExportService {
  requestExport(args: ExportRequestArgs): Promise<ExportPackageResponse>;
  downloadExport(args: DownloadExportArgs): Promise<ExportDownloadResult>;
}

export class DefaultExportService implements ExportService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly signer: ExportUrlSigner,
    private readonly appOrigin = 'http://localhost:5001',
    private readonly now: () => Date = () => new Date(),
  ) {}

  async requestExport(args: ExportRequestArgs): Promise<ExportPackageResponse> {
    const snapshot = await this.platformStore.getPackageSnapshot({
      packageSnapshotId: args.packageId,
    });

    if (snapshot === null || snapshot.processId !== args.processId) {
      throw buildExportNotFoundError();
    }

    await readExportableMembers(this.platformStore, snapshot);

    const exportId = randomUUID();
    const expiresAt = new Date(this.now().getTime() + EXPORT_URL_LIFETIME_MS).toISOString();
    const token = this.signer.mint({
      exportId,
      packageSnapshotId: snapshot.packageSnapshotId,
      actorId: args.actorId,
      expiresAt,
    });

    const downloadPath = `${buildReviewExportDownloadApiPath({
      projectId: args.projectId,
      processId: args.processId,
      exportId,
    })}?token=${encodeURIComponent(token)}`;

    return exportPackageResponseSchema.parse({
      exportId,
      downloadName: `${sanitizeDownloadBaseName(snapshot.displayName)}.mpkz`,
      downloadUrl: new URL(downloadPath, this.appOrigin).toString(),
      contentType: 'application/gzip',
      packageFormat: 'mpkz',
      expiresAt,
    });
  }

  async downloadExport(args: DownloadExportArgs): Promise<ExportDownloadResult> {
    const verification = this.signer.verify(args.token);
    if (
      !verification.valid ||
      verification.payload.exportId !== args.exportId ||
      verification.payload.actorId !== args.actorId
    ) {
      throw buildExportNotFoundError();
    }

    const payload = verification.payload;
    const snapshot = await this.platformStore.getPackageSnapshot({
      packageSnapshotId: payload.packageSnapshotId,
    });

    if (snapshot === null || snapshot.processId !== args.processId) {
      throw buildExportNotFoundError();
    }

    let members: ExportablePackageMember[];
    try {
      members = await readExportableMembers(this.platformStore, snapshot);
    } catch (error) {
      if (error instanceof AppError && error.code === reviewExportNotAvailableErrorCode) {
        throw buildExportFailedError(error.message);
      }
      throw error;
    }

    const manifestItems = members.map((member) => ({
      title: `${member.displayName} (${member.versionLabel})`,
      path: buildMemberArchivePath({
        displayName: member.displayName,
        position: member.position,
      }),
    }));

    const archive = createPackageFromEntries({
      manifest: {
        metadata: {
          title: snapshot.displayName,
          packageType: snapshot.packageType,
          packageId: snapshot.packageSnapshotId,
          publishedAt: snapshot.publishedAt,
        },
        items: manifestItems,
      },
      compress: true,
      entries: this.streamPackageEntries(
        members,
        manifestItems.map((item) => item.path),
      ),
    });

    return {
      downloadName: `${sanitizeDownloadBaseName(snapshot.displayName)}.mpkz`,
      packageId: snapshot.packageSnapshotId,
      stream: archive,
    };
  }

  private async *streamPackageEntries(
    members: ExportablePackageMember[],
    filePaths: string[],
  ): AsyncGenerator<{ path: string; content: string | Buffer | Readable; size?: number }> {
    for (const [index, member] of members.entries()) {
      const contentUrl = await this.platformStore.getArtifactVersionContentUrl({
        versionId: member.artifactVersion.versionId,
      });

      if (contentUrl === null) {
        throw buildExportFailedError('Package export failed while loading member content.');
      }

      let response: Response;
      try {
        response = await fetch(contentUrl);
      } catch {
        throw buildExportFailedError('Package export failed while reading member content.');
      }

      if (!response.ok) {
        throw buildExportFailedError('Package export failed while reading member content.');
      }

      if (response.body === null) {
        throw buildExportFailedError('Package export failed while reading member content.');
      }

      yield {
        path: filePaths[index] ?? `${sanitizeDownloadBaseName(member.displayName)}.md`,
        content: Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
        size: member.artifactVersion.bytes,
      };
    }
  }
}

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildShellBootstrapPayload } from '../config.js';
import { AppError } from '../errors/app-error.js';
import { reviewExportFailedErrorCode } from '../errors/codes.js';
import { sessionCookieName } from '../services/auth/auth-session.service.js';
import { inspectExportTokenPayload } from '../services/review/export-url-signing.js';
import {
  getReviewArtifactRouteSchema,
  getReviewExportDownloadRouteSchema,
  getReviewPackageRouteSchema,
  getReviewWorkspaceRouteSchema,
  postReviewPackageExportRouteSchema,
  reviewHtmlRouteSchema,
} from '../schemas/review.js';
import {
  reviewWorkspaceApiPathnamePattern,
  reviewWorkspaceRoutePathnamePattern,
  type RequestError,
} from '../../shared/contracts/index.js';

function buildRequestError(error: AppError): RequestError {
  return {
    code: error.code as RequestError['code'],
    message: error.message,
    status: error.statusCode,
  };
}

function buildLoginRedirectPath(returnTo: string): string {
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function buildReviewTargetNotFoundResponse(): RequestError {
  return {
    code: 'REVIEW_TARGET_NOT_FOUND',
    message: 'The requested review target could not be found.',
    status: 404,
  };
}

function applyExportDownloadNoStoreHeaders(reply: FastifyReply): void {
  reply.header('Cache-Control', 'private, no-store, max-age=0');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');
}

function logAccessBlocked(args: {
  app: FastifyInstance;
  projectId: string;
  processId: string;
  reason: 'UNAUTHENTICATED' | 'PROJECT_FORBIDDEN';
}): void {
  args.app.log.warn(
    {
      event: 'review.access-blocked',
      projectId: args.projectId,
      processId: args.processId,
      reason: args.reason,
    },
    'Review route access blocked.',
  );
}

function renderUnavailableShell(title: string, message: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`;
}

export const reviewRoutePatterns = {
  shell: reviewWorkspaceRoutePathnamePattern,
  bootstrap: reviewWorkspaceApiPathnamePattern,
} as const;

export async function registerReviewRoutes(app: FastifyInstance): Promise<void> {
  void reviewRoutePatterns;

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/projects/:projectId/processes/:processId/review',
    {
      schema: {
        params: getReviewWorkspaceRouteSchema.params,
        response: reviewHtmlRouteSchema.response,
      },
    },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }
        logAccessBlocked({
          app,
          projectId: request.params.projectId,
          processId: request.params.processId,
          reason: 'UNAUTHENTICATED',
        });

        return reply.redirect(buildLoginRedirectPath(request.url));
      }

      const access = await app.processAccessService.getProcessAccess({
        actor: request.actor,
        projectId: request.params.projectId,
        processId: request.params.processId,
      });

      if (access.kind === 'forbidden') {
        logAccessBlocked({
          app,
          projectId: request.params.projectId,
          processId: request.params.processId,
          reason: 'PROJECT_FORBIDDEN',
        });
        return reply
          .code(403)
          .type('text/html')
          .send(renderUnavailableShell('Access denied', 'You do not have access to this process.'));
      }

      if (access.kind === 'project_not_found') {
        return reply
          .code(404)
          .type('text/html')
          .send(
            renderUnavailableShell(
              'Project not found',
              'The requested project could not be found.',
            ),
          );
      }

      if (access.kind === 'process_not_found') {
        return reply
          .code(404)
          .type('text/html')
          .send(
            renderUnavailableShell(
              'Process unavailable',
              'The requested process could not be opened.',
            ),
          );
      }

      const url = new URL(request.url, 'http://story4.local');
      const payload = buildShellBootstrapPayload({
        actor: {
          id: request.actor.userId,
          email: request.actor.email,
          displayName: request.actor.displayName,
        },
        pathname: `/projects/${request.params.projectId}/processes/${request.params.processId}/review`,
        search: url.search,
        csrfToken: reply.generateCsrf(),
      });

      return reply.type('text/html').send(await app.renderShellDocument(payload, request.url));
    },
  );

  typedApp.get(
    '/api/projects/:projectId/processes/:processId/review',
    {
      schema: getReviewWorkspaceRouteSchema,
    },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }
        logAccessBlocked({
          app,
          projectId: request.params.projectId,
          processId: request.params.processId,
          reason: 'UNAUTHENTICATED',
        });

        return reply.code(401).send({
          code: 'UNAUTHENTICATED',
          message: 'Authenticated access is required.',
          status: 401,
        });
      }

      try {
        const workspace = await app.reviewWorkspaceService.getWorkspace({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
          selection: request.query,
        });

        app.log.info(
          {
            event: 'review.workspace.bootstrap',
            selectionTargetKind: request.query.targetKind ?? null,
            availableTargetCount: workspace.availableTargets.length,
            responseStatus: 200,
          },
          'Review workspace bootstrap resolved.',
        );
        if (workspace.target?.status === 'unavailable') {
          app.log.warn(
            {
              event: 'review.target.unavailable',
              targetKind: workspace.target.targetKind,
              targetId: request.query.targetId ?? workspace.process.reviewTargetId ?? null,
              reason: workspace.target.error?.code ?? 'REVIEW_TARGET_NOT_FOUND',
            },
            'Review target unavailable.',
          );
        }

        return reply.send(workspace);
      } catch (error) {
        if (error instanceof AppError) {
          const requestError = buildRequestError(error);

          switch (error.statusCode) {
            case 401:
              return reply.code(401).send(requestError);
            case 403:
              return reply.code(403).send(requestError);
            case 404:
              return reply.code(404).send(requestError);
            default:
              throw error;
          }
        }

        throw error;
      }
    },
  );

  typedApp.get(
    '/api/projects/:projectId/processes/:processId/review/artifacts/:artifactId',
    {
      schema: getReviewArtifactRouteSchema,
    },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }
        logAccessBlocked({
          app,
          projectId: request.params.projectId,
          processId: request.params.processId,
          reason: 'UNAUTHENTICATED',
        });

        return reply.code(401).send({
          code: 'UNAUTHENTICATED',
          message: 'Authenticated access is required.',
          status: 401,
        });
      }

      try {
        await app.processAccessService.assertProcessAccess({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        const artifactReview = await app.artifactReviewService.getArtifactReview({
          projectId: request.params.projectId,
          processId: request.params.processId,
          artifactId: request.params.artifactId,
          versionId: request.query.versionId,
        });

        if (artifactReview === null) {
          app.log.warn(
            {
              event: 'review.target.unavailable',
              targetKind: 'artifact',
              targetId: request.params.artifactId,
              reason: 'REVIEW_TARGET_NOT_FOUND',
            },
            'Review target unavailable.',
          );
          return reply.code(404).send({
            code: 'REVIEW_TARGET_NOT_FOUND',
            message: 'The requested review target could not be found.',
            status: 404,
          });
        }

        return reply.send(artifactReview);
      } catch (error) {
        if (error instanceof AppError) {
          const requestError = buildRequestError(error);

          switch (error.statusCode) {
            case 401:
              return reply.code(401).send(requestError);
            case 403:
              return reply.code(403).send(requestError);
            case 404:
              return reply.code(404).send(requestError);
            default:
              throw error;
          }
        }

        throw error;
      }
    },
  );

  typedApp.get(
    '/api/projects/:projectId/processes/:processId/review/packages/:packageId',
    {
      schema: getReviewPackageRouteSchema,
    },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }
        logAccessBlocked({
          app,
          projectId: request.params.projectId,
          processId: request.params.processId,
          reason: 'UNAUTHENTICATED',
        });

        return reply.code(401).send({
          code: 'UNAUTHENTICATED',
          message: 'Authenticated access is required.',
          status: 401,
        });
      }

      try {
        await app.processAccessService.assertProcessAccess({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        const packageReview = await app.packageReviewService.getPackageReview({
          projectId: request.params.projectId,
          processId: request.params.processId,
          packageId: request.params.packageId,
          memberId: request.query.memberId,
        });

        if (packageReview === null) {
          app.log.warn(
            {
              event: 'review.target.unavailable',
              targetKind: 'package',
              targetId: request.params.packageId,
              reason: 'REVIEW_TARGET_NOT_FOUND',
            },
            'Review target unavailable.',
          );
          return reply.code(404).send({
            code: 'REVIEW_TARGET_NOT_FOUND',
            message: 'The requested review target could not be found.',
            status: 404,
          });
        }

        return reply.send(packageReview);
      } catch (error) {
        if (error instanceof AppError) {
          const requestError = buildRequestError(error);

          switch (error.statusCode) {
            case 401:
              return reply.code(401).send(requestError);
            case 403:
              return reply.code(403).send(requestError);
            case 404:
              return reply.code(404).send(requestError);
            default:
              throw error;
          }
        }

        throw error;
      }
    },
  );

  typedApp.post(
    '/api/projects/:projectId/processes/:processId/review/packages/:packageId/export',
    {
      schema: postReviewPackageExportRouteSchema,
    },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }
        logAccessBlocked({
          app,
          projectId: request.params.projectId,
          processId: request.params.processId,
          reason: 'UNAUTHENTICATED',
        });

        return reply.code(401).send({
          code: 'UNAUTHENTICATED',
          message: 'Authenticated access is required.',
          status: 401,
        });
      }

      try {
        await app.processAccessService.assertProcessAccess({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        const exportResponse = await app.exportService.requestExport({
          projectId: request.params.projectId,
          processId: request.params.processId,
          packageId: request.params.packageId,
          actorId: request.actor.userId,
        });

        app.log.info(
          {
            event: 'review.export.requested',
            packageId: request.params.packageId,
            processId: request.params.processId,
            actorId: request.actor.userId,
            exportId: exportResponse.exportId,
            result: 'success',
          },
          'Review package export requested.',
        );

        return reply.send(exportResponse);
      } catch (error) {
        if (error instanceof AppError) {
          app.log.warn(
            {
              event: 'review.export.requested',
              packageId: request.params.packageId,
              processId: request.params.processId,
              actorId: request.actor.userId,
              exportId: null,
              result: 'failure',
              reason: error.code,
            },
            'Review package export request failed.',
          );

          const requestError = buildRequestError(error);

          switch (error.statusCode) {
            case 401:
              return reply.code(401).send(requestError);
            case 403:
              return reply.code(403).send(requestError);
            case 404:
              return reply.code(404).send(requestError);
            case 409:
              return reply.code(409).send(requestError);
            case 503:
              return reply.code(503).send(requestError);
            default:
              throw error;
          }
        }

        app.log.error(
          {
            err: error,
            event: 'review.export.requested',
            packageId: request.params.packageId,
            processId: request.params.processId,
            actorId: request.actor.userId,
            exportId: null,
            result: 'failure',
            reason: 'unexpected_exception',
          },
          'Review package export request failed unexpectedly.',
        );

        return reply.code(503).send({
          code: reviewExportFailedErrorCode,
          message: 'Package export failed during preparation.',
          status: 503,
        });
      }
    },
  );

  typedApp.get(
    '/api/projects/:projectId/processes/:processId/review/exports/:exportId',
    {
      schema: getReviewExportDownloadRouteSchema,
    },
    async (request, reply) => {
      if (request.actor === null) {
        applyExportDownloadNoStoreHeaders(reply);
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }
        logAccessBlocked({
          app,
          projectId: request.params.projectId,
          processId: request.params.processId,
          reason: 'UNAUTHENTICATED',
        });

        return reply.code(401).send({
          code: 'UNAUTHENTICATED',
          message: 'Authenticated access is required.',
          status: 401,
        });
      }

      let recoverablePackageId: string | undefined;

      try {
        await app.processAccessService.assertProcessAccess({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        if (typeof request.query.token !== 'string' || request.query.token.length === 0) {
          applyExportDownloadNoStoreHeaders(reply);
          app.log.warn(
            {
              event: 'review.export.download-failed',
              packageId: null,
              exportId: request.params.exportId,
              result: 'failure',
              reason: 'missing_token',
            },
            'Review package export download failed.',
          );

          return reply.code(404).send(buildReviewTargetNotFoundResponse());
        }

        recoverablePackageId = inspectExportTokenPayload(request.query.token)?.packageSnapshotId;

        const download = await app.exportService.downloadExport({
          projectId: request.params.projectId,
          processId: request.params.processId,
          exportId: request.params.exportId,
          token: request.query.token,
          actorId: request.actor.userId,
        });

        recoverablePackageId = download.packageId;

        app.log.info(
          {
            event: 'review.export.downloaded',
            packageId: download.packageId,
            exportId: request.params.exportId,
            result: 'success',
          },
          'Review package export downloaded.',
        );

        reply.header('Content-Type', 'application/gzip');
        reply.header('Content-Disposition', `attachment; filename="${download.downloadName}"`);
        applyExportDownloadNoStoreHeaders(reply);

        download.stream.once('error', (streamError: unknown) => {
          app.log.warn(
            {
              event: 'review.export.download-failed',
              packageId: download.packageId,
              exportId: request.params.exportId,
              result: 'failure',
              reason: streamError instanceof Error ? streamError.message : 'stream_error',
            },
            'Review package export download failed.',
          );
        });

        return reply.send(download.stream as never);
      } catch (error) {
        if (error instanceof AppError) {
          applyExportDownloadNoStoreHeaders(reply);
          app.log.warn(
            {
              event: 'review.export.token-verify-failed',
              exportId: request.params.exportId,
              reason: error.code,
            },
            'Review export token verification failed.',
          );
          app.log.warn(
            {
              event: 'review.export.download-failed',
              packageId: recoverablePackageId ?? null,
              exportId: request.params.exportId,
              result: 'failure',
              reason: error.code,
            },
            'Review package export download failed.',
          );

          const requestError = buildRequestError(error);

          switch (error.statusCode) {
            case 401:
              return reply.code(401).send(requestError);
            case 403:
              return reply.code(403).send(requestError);
            case 404:
              return reply.code(404).send(requestError);
            case 503:
              return reply.code(503).send(requestError);
            default:
              throw error;
          }
        }

        applyExportDownloadNoStoreHeaders(reply);
        throw error;
      }
    },
  );
}

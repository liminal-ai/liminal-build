import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildShellBootstrapPayload } from '../config.js';
import { AppError } from '../errors/app-error.js';
import { sessionCookieName } from '../services/auth/auth-session.service.js';
import {
  getReviewArtifactRouteSchema,
  getReviewWorkspaceRouteSchema,
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

        return reply.redirect(buildLoginRedirectPath(request.url));
      }

      const access = await app.processAccessService.getProcessAccess({
        actor: request.actor,
        projectId: request.params.projectId,
        processId: request.params.processId,
      });

      if (access.kind === 'forbidden') {
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
            method: request.method,
            url: request.url,
            actorId: request.actor.userId,
            projectId: request.params.projectId,
            processId: request.params.processId,
            targetId:
              workspace.target?.targetKind === 'artifact'
                ? workspace.target.artifact?.artifactId
                : (workspace.target?.package?.packageId ?? null),
          },
          'Review workspace opened.',
        );

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
}

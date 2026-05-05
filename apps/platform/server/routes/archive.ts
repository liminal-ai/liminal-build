import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildShellBootstrapPayload } from '../config.js';
import { AppError } from '../errors/app-error.js';
import {
  getDerivedArchiveViewsRouteSchema,
  getProcessArchiveRouteSchema,
  getProcessArchiveTurnsRouteSchema,
  postRefreshDerivedArchiveViewsRouteSchema,
} from '../schemas/archive.js';
import { sessionCookieName } from '../services/auth/auth-session.service.js';
import {
  processArchiveApiPathnamePattern,
  processArchiveTurnsApiPathnamePattern,
  processDerivedArchiveViewsApiPathnamePattern,
  processDerivedArchiveViewsRefreshApiPathnamePattern,
  processArchiveRoutePathnamePattern,
  type RequestError,
} from '../../shared/contracts/index.js';

function buildRequestError(error: AppError): RequestError {
  return {
    code: error.code as RequestError['code'],
    message: error.message,
    status: error.statusCode,
  };
}

export const archiveRoutePatterns = {
  shell: processArchiveRoutePathnamePattern,
  bootstrap: processArchiveApiPathnamePattern,
  turns: processArchiveTurnsApiPathnamePattern,
  derivedViews: processDerivedArchiveViewsApiPathnamePattern,
  refreshDerivedViews: processDerivedArchiveViewsRefreshApiPathnamePattern,
} as const;

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

export async function registerArchiveRoutes(app: FastifyInstance): Promise<void> {
  void archiveRoutePatterns;

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/projects/:projectId/processes/:processId/archive',
    {
      schema: {
        params: getProcessArchiveRouteSchema.params,
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
              'The requested process archive could not be opened.',
            ),
          );
      }

      const url = new URL(request.url, 'http://story3.local');
      const payload = buildShellBootstrapPayload({
        actor: {
          id: request.actor.userId,
          email: request.actor.email,
          displayName: request.actor.displayName,
        },
        pathname: `/projects/${request.params.projectId}/processes/${request.params.processId}/archive`,
        search: url.search,
        csrfToken: reply.generateCsrf(),
      });

      return reply.type('text/html').send(await app.renderShellDocument(payload, request.url));
    },
  );

  typedApp.get(
    '/api/projects/:projectId/processes/:processId/archive/turns',
    {
      schema: getProcessArchiveTurnsRouteSchema,
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
        const turns = await app.turnDerivationService.getTurns({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
          cursor: request.query.cursor,
          limit: request.query.limit,
        });

        return reply.code(200).send(turns);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 422;

          return reply.code(statusCode).send(buildRequestError(error));
        }

        throw error;
      }
    },
  );

  typedApp.get(
    '/api/projects/:projectId/processes/:processId/archive/derived-views',
    {
      schema: getDerivedArchiveViewsRouteSchema,
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
        const response = await app.derivedArchiveViewService.listViews({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 422;

          return reply.code(statusCode).send(buildRequestError(error));
        }

        throw error;
      }
    },
  );

  typedApp.post(
    '/api/projects/:projectId/processes/:processId/archive/derived-views/refresh',
    {
      schema: postRefreshDerivedArchiveViewsRouteSchema,
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
        const response = await app.derivedArchiveViewService.refreshViews({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 409 | 422;

          return reply.code(statusCode).send(buildRequestError(error));
        }

        throw error;
      }
    },
  );

  typedApp.get(
    '/api/projects/:projectId/processes/:processId/archive',
    {
      schema: getProcessArchiveRouteSchema,
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
        const archive = await app.archiveReadService.getArchive({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
          cursor: request.query.cursor,
          limit: request.query.limit,
        });

        return reply.code(200).send(archive);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 422;

          return reply.code(statusCode).send(buildRequestError(error));
        }

        throw error;
      }
    },
  );
}

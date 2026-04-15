import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildShellBootstrapPayload } from '../config.js';
import { AppError } from '../errors/app-error.js';
import {
  getProcessWorkSurfaceRouteSchema,
  processHtmlRouteSchema,
  resumeProcessRouteSchema,
  startProcessRouteSchema,
  submitProcessResponseRouteSchema,
} from '../schemas/processes.js';
import { sessionCookieName } from '../services/auth/auth-session.service.js';
import {
  processLiveUpdatesPathnamePattern,
  processResponseApiPathnamePattern,
  processResumeApiPathnamePattern,
  processStartApiPathnamePattern,
  processWorkSurfaceApiPathnamePattern,
  processWorkSurfaceRoutePathnamePattern,
} from '../../shared/contracts/index.js';
import type { ProcessWorkSurfaceResponse, RequestError } from '../../shared/contracts/index.js';

function buildRequestError(error: AppError): RequestError {
  return {
    code: error.code as RequestError['code'],
    message: error.message,
    status: error.statusCode,
  };
}

function buildInitialLivePublication(surface: ProcessWorkSurfaceResponse) {
  return {
    messageType: 'snapshot' as const,
    process: surface.process,
    historyItems: surface.history.status === 'ready' ? surface.history.items : [],
    currentRequest: surface.currentRequest,
    materials: surface.materials,
    sideWork: surface.sideWork,
    environment: surface.environment,
    sectionErrors: {
      history: surface.history.status === 'error' ? surface.history.error : undefined,
      materials: surface.materials.status === 'error' ? surface.materials.error : undefined,
      side_work: surface.sideWork.status === 'error' ? surface.sideWork.error : undefined,
    },
  };
}

export const processRoutePatterns = {
  shell: processWorkSurfaceRoutePathnamePattern,
  bootstrap: processWorkSurfaceApiPathnamePattern,
  start: processStartApiPathnamePattern,
  resume: processResumeApiPathnamePattern,
  respond: processResponseApiPathnamePattern,
  live: processLiveUpdatesPathnamePattern,
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

export async function registerProcessRoutes(app: FastifyInstance): Promise<void> {
  void processRoutePatterns;

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/ws/projects/:projectId/processes/:processId',
    {
      schema: {
        params: getProcessWorkSurfaceRouteSchema.params,
      },
      websocket: true,
      preValidation: async (request, reply) => {
        const params = request.params as { projectId: string; processId: string };
        const resolution = await app.authSessionService.resolveSession(
          request.cookies[sessionCookieName],
        );

        request.actor = resolution.actor;
        request.authFailureReason = resolution.reason;

        if (request.actor !== null) {
          request.actor = await app.authUserSyncService.syncActor(request.actor);
        }

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
            projectId: params.projectId,
            processId: params.processId,
          });
        } catch (error) {
          if (error instanceof AppError) {
            return reply.code(error.statusCode).send(buildRequestError(error));
          }

          throw error;
        }
      },
    },
    (socket, request) => {
      const params = request.params as { projectId: string; processId: string };
      socket.on('message', () => {});

      const actor = request.actor;

      if (actor === null) {
        socket.close(1008, 'Authenticated access is required.');
        return;
      }

      let subscription = { close() {} };
      let isClosed = false;

      socket.on('close', () => {
        isClosed = true;
        subscription.close();
      });

      void app.processWorkSurfaceService
        .getSurface({
          actor,
          projectId: params.projectId,
          processId: params.processId,
        })
        .then((surface) => {
          if (isClosed) {
            return;
          }

          subscription = app.processLiveHub.subscribe({
            actorId: actor.userId,
            projectId: params.projectId,
            processId: params.processId,
            send: (message) => {
              socket.send(JSON.stringify(message));
            },
            initialPublication: buildInitialLivePublication(surface),
          });
        })
        .catch(() => {
          if (!isClosed) {
            socket.close(1011, 'Process live updates unavailable.');
          }
        });
    },
  );

  typedApp.get(
    '/projects/:projectId/processes/:processId',
    {
      schema: {
        params: getProcessWorkSurfaceRouteSchema.params,
        response: processHtmlRouteSchema.response,
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

      const url = new URL(request.url, 'http://story2.local');
      const payload = buildShellBootstrapPayload({
        actor: {
          id: request.actor.userId,
          email: request.actor.email,
          displayName: request.actor.displayName,
        },
        pathname: `/projects/${request.params.projectId}/processes/${request.params.processId}`,
        search: url.search,
        csrfToken: reply.generateCsrf(),
      });

      return reply.type('text/html').send(await app.renderShellDocument(payload, request.url));
    },
  );

  typedApp.get(
    '/api/projects/:projectId/processes/:processId',
    {
      schema: getProcessWorkSurfaceRouteSchema,
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
        const surface = await app.processWorkSurfaceService.getSurface({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        return reply.code(200).send(surface);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404;
          const code = error.code as
            | 'PROJECT_FORBIDDEN'
            | 'PROJECT_NOT_FOUND'
            | 'PROCESS_NOT_FOUND';

          return reply.code(statusCode).send({
            code,
            message: error.message,
            status: statusCode,
          });
        }

        throw error;
      }
    },
  );

  typedApp.post(
    '/api/projects/:projectId/processes/:processId/start',
    {
      schema: startProcessRouteSchema,
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
        const response = await app.processStartService.start({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 409;
          const code = error.code as
            | 'PROJECT_FORBIDDEN'
            | 'PROJECT_NOT_FOUND'
            | 'PROCESS_NOT_FOUND'
            | 'PROCESS_ACTION_NOT_AVAILABLE';

          return reply.code(statusCode).send({
            code,
            message: error.message,
            status: statusCode,
          });
        }

        throw error;
      }
    },
  );

  typedApp.post(
    '/api/projects/:projectId/processes/:processId/responses',
    {
      schema: submitProcessResponseRouteSchema,
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
        const response = await app.processResponseService.respond({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
          body: request.body,
        });

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 409 | 422 | 500;
          const code = error.code as
            | 'PROJECT_FORBIDDEN'
            | 'PROJECT_NOT_FOUND'
            | 'PROCESS_NOT_FOUND'
            | 'PROCESS_ACTION_NOT_AVAILABLE'
            | 'INVALID_PROCESS_RESPONSE'
            | 'PROCESS_ACTION_FAILED';

          return reply.code(statusCode).send({
            code,
            message: error.message,
            status: statusCode,
          });
        }

        throw error;
      }
    },
  );

  typedApp.post(
    '/api/projects/:projectId/processes/:processId/resume',
    {
      schema: resumeProcessRouteSchema,
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
        const response = await app.processResumeService.resume({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
        });

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 409;
          const code = error.code as
            | 'PROJECT_FORBIDDEN'
            | 'PROJECT_NOT_FOUND'
            | 'PROCESS_NOT_FOUND'
            | 'PROCESS_ACTION_NOT_AVAILABLE';

          return reply.code(statusCode).send({
            code,
            message: error.message,
            status: statusCode,
          });
        }

        throw error;
      }
    },
  );
}

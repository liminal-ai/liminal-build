import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { RequestError } from '../../shared/contracts/index.js';
import {
  createProcessSourceAttachmentRouteSchema,
  createProjectSourceAttachmentRouteSchema,
  refreshSourceAttachmentRouteSchema,
  updateSourceAttachmentRouteSchema,
} from '../schemas/source-management.js';
import { sessionCookieName } from '../services/auth/auth-session.service.js';
import { AppError } from '../errors/app-error.js';

function buildUnauthenticatedResponse() {
  return {
    code: 'UNAUTHENTICATED' as const,
    message: 'Authenticated access is required.',
    status: 401 as const,
  };
}

function buildRequestError(error: AppError, statusCode: 403 | 404 | 409 | 422 | 503): RequestError {
  return {
    code: error.code as RequestError['code'],
    message: error.message,
    status: statusCode,
  };
}

export async function registerSourceManagementRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    '/api/projects/:projectId/source-attachments',
    { schema: createProjectSourceAttachmentRouteSchema },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }

        return reply.code(401).send(buildUnauthenticatedResponse());
      }

      const access = await app.projectAccessService.getProjectAccess({
        actor: request.actor,
        projectId: request.params.projectId,
      });

      if (access.kind === 'forbidden') {
        return reply.code(403).send({
          code: 'PROJECT_FORBIDDEN',
          message: 'The current actor cannot access this project.',
          status: 403,
        });
      }

      if (access.kind === 'not_found') {
        return reply.code(404).send({
          code: 'PROJECT_NOT_FOUND',
          message: 'The requested project was not found.',
          status: 404,
        });
      }

      try {
        const attachment = await app.sourceManagementService.attachProjectSource({
          actor: request.actor,
          projectId: request.params.projectId,
          input: request.body,
        });

        return reply.code(201).send(attachment);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 409 | 503;
          return reply.code(statusCode).send(buildRequestError(error, statusCode));
        }

        throw error;
      }
    },
  );

  typedApp.post(
    '/api/projects/:projectId/processes/:processId/source-attachments',
    { schema: createProcessSourceAttachmentRouteSchema },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }

        return reply.code(401).send(buildUnauthenticatedResponse());
      }

      const access = await app.processAccessService.getProcessAccess({
        actor: request.actor,
        projectId: request.params.projectId,
        processId: request.params.processId,
      });

      if (access.kind === 'forbidden') {
        return reply.code(403).send({
          code: 'PROCESS_FORBIDDEN',
          message: 'The current actor cannot access this process.',
          status: 403,
        });
      }

      if (access.kind === 'project_not_found') {
        return reply.code(404).send({
          code: 'PROJECT_NOT_FOUND',
          message: 'The requested project was not found.',
          status: 404,
        });
      }

      if (access.kind === 'process_not_found') {
        return reply.code(404).send({
          code: 'PROCESS_NOT_FOUND',
          message: 'The requested process could not be found.',
          status: 404,
        });
      }

      try {
        const attachment = await app.sourceManagementService.attachProcessSource({
          actor: request.actor,
          projectId: request.params.projectId,
          processId: request.params.processId,
          input: request.body,
        });

        return reply.code(201).send(attachment);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 409 | 503;
          return reply.code(statusCode).send(buildRequestError(error, statusCode));
        }

        throw error;
      }
    },
  );

  typedApp.patch(
    '/api/projects/:projectId/source-attachments/:sourceAttachmentId',
    { schema: updateSourceAttachmentRouteSchema },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }

        return reply.code(401).send(buildUnauthenticatedResponse());
      }

      const access = await app.projectAccessService.getProjectAccess({
        actor: request.actor,
        projectId: request.params.projectId,
      });

      if (access.kind === 'forbidden') {
        return reply.code(403).send({
          code: 'PROJECT_FORBIDDEN',
          message: 'The current actor cannot access this project.',
          status: 403,
        });
      }

      if (access.kind === 'not_found') {
        return reply.code(404).send({
          code: 'PROJECT_NOT_FOUND',
          message: 'The requested project was not found.',
          status: 404,
        });
      }

      try {
        const attachment = await app.sourceManagementService.updateSource({
          actor: request.actor,
          projectId: request.params.projectId,
          sourceAttachmentId: request.params.sourceAttachmentId,
          input: request.body,
        });

        return reply.code(200).send(attachment);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 409 | 503;
          return reply.code(statusCode).send(buildRequestError(error, statusCode));
        }

        throw error;
      }
    },
  );

  typedApp.post(
    '/api/projects/:projectId/source-attachments/:sourceAttachmentId/refresh',
    { schema: refreshSourceAttachmentRouteSchema },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }

        return reply.code(401).send(buildUnauthenticatedResponse());
      }

      const access = await app.projectAccessService.getProjectAccess({
        actor: request.actor,
        projectId: request.params.projectId,
      });

      if (access.kind === 'forbidden') {
        return reply.code(403).send({
          code: 'PROJECT_FORBIDDEN',
          message: 'The current actor cannot access this project.',
          status: 403,
        });
      }

      if (access.kind === 'not_found') {
        return reply.code(404).send({
          code: 'PROJECT_NOT_FOUND',
          message: 'The requested project was not found.',
          status: 404,
        });
      }

      try {
        const refreshResponse = await app.sourceRefreshService.refreshSource({
          actor: request.actor,
          projectId: request.params.projectId,
          sourceAttachmentId: request.params.sourceAttachmentId,
        });

        return reply.code(200).send(refreshResponse);
      } catch (error) {
        if (error instanceof AppError) {
          const statusCode = error.statusCode as 403 | 404 | 409 | 503;
          return reply.code(statusCode).send(buildRequestError(error, statusCode));
        }

        throw error;
      }
    },
  );
}

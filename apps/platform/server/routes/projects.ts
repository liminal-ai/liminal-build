import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildShellBootstrapPayload } from '../config.js';
import {
  createProcessRouteSchema,
  createProjectRouteSchema,
  getProjectShellRouteSchema,
  listProjectsRouteSchema,
  projectParamsSchema,
  shellHtmlRouteSchema,
} from '../schemas/projects.js';
import { sessionCookieName } from '../services/auth/auth-session.service.js';

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

export async function registerProjectRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get('/', async (_request, reply) => {
    return reply.redirect('/projects');
  });

  typedApp.get(
    '/projects',
    {
      schema: shellHtmlRouteSchema,
    },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }

        return reply.redirect(buildLoginRedirectPath('/projects'));
      }

      const url = new URL(request.url, 'http://story1.local');
      const payload = buildShellBootstrapPayload({
        actor: {
          id: request.actor.userId,
          email: request.actor.email,
          displayName: request.actor.displayName,
        },
        pathname: '/projects',
        search: url.search,
        csrfToken: reply.generateCsrf(),
      });

      return reply.type('text/html').send(await app.renderShellDocument(payload, request.url));
    },
  );

  typedApp.get(
    '/projects/:projectId',
    {
      schema: {
        params: projectParamsSchema,
        querystring: shellHtmlRouteSchema.querystring,
        response: shellHtmlRouteSchema.response,
      },
    },
    async (request, reply) => {
      if (request.actor === null) {
        if (request.authFailureReason === 'invalid_session') {
          reply.clearCookie(sessionCookieName, { path: '/' });
        }

        return reply.redirect(buildLoginRedirectPath(request.url));
      }

      const access = await app.projectAccessService.getProjectAccess({
        actor: request.actor,
        projectId: request.params.projectId,
      });

      if (access.kind === 'forbidden') {
        return reply
          .code(403)
          .type('text/html')
          .send(
            renderUnavailableShell(
              'Project unavailable',
              'You do not have access to this project.',
            ),
          );
      }

      if (access.kind === 'not_found') {
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

      const url = new URL(request.url, 'http://story1.local');
      const payload = buildShellBootstrapPayload({
        actor: {
          id: request.actor.userId,
          email: request.actor.email,
          displayName: request.actor.displayName,
        },
        pathname: `/projects/${request.params.projectId}`,
        search: url.search,
        csrfToken: reply.generateCsrf(),
      });

      return reply.type('text/html').send(await app.renderShellDocument(payload, request.url));
    },
  );

  typedApp.get('/api/projects', { schema: listProjectsRouteSchema }, async (request, reply) => {
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

    const actor = request.actor;
    const projects = await app.projectIndexService.listAccessibleProjects(actor);

    return reply.code(200).send(projects);
  });

  typedApp.post('/api/projects', { schema: createProjectRouteSchema }, async (_request, reply) => {
    return reply.code(501).send({
      code: 'INVALID_PROJECT_NAME',
      message: 'Project creation is not implemented until Story 2.',
      status: 501,
    });
  });

  typedApp.get(
    '/api/projects/:projectId',
    { schema: getProjectShellRouteSchema },
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

      const actor = request.actor;
      const access = await app.projectAccessService.getProjectAccess({
        actor,
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

      const shell = await app.projectShellService.getShell({
        actor,
        projectId: request.params.projectId,
      });

      return reply.code(200).send(shell);
    },
  );

  typedApp.post(
    '/api/projects/:projectId/processes',
    { schema: createProcessRouteSchema },
    async (_request, reply) => {
      return reply.code(501).send({
        code: 'INVALID_PROCESS_TYPE',
        message: 'Process registration is not implemented until Story 4.',
        status: 501,
      });
    },
  );
}

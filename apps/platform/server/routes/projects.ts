import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildShellBootstrapPayload } from '../config.js';
import {
  buildProjectsStory0Message,
  createProcessRouteSchema,
  createProjectRouteSchema,
  getProjectShellRouteSchema,
  listProjectsRouteSchema,
  projectParamsSchema,
  shellHtmlRouteSchema,
} from '../schemas/projects.js';

export async function registerProjectRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/projects',
    {
      schema: shellHtmlRouteSchema,
    },
    async (request, reply) => {
      const url = new URL(request.url, 'http://story0.local');
      const payload = buildShellBootstrapPayload({
        pathname: '/projects',
        search: url.search,
        csrfToken: reply.generateCsrf(),
      });

      return reply.type('text/html').send(app.renderShellDocument(payload));
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
      const url = new URL(request.url, 'http://story0.local');
      const payload = buildShellBootstrapPayload({
        pathname: `/projects/${request.params.projectId}`,
        search: url.search,
        csrfToken: reply.generateCsrf(),
      });

      return reply.type('text/html').send(app.renderShellDocument(payload));
    },
  );

  typedApp.get('/api/projects', { schema: listProjectsRouteSchema }, async (_request, reply) => {
    return reply.code(501).send(buildProjectsStory0Message('GET /api/projects'));
  });

  typedApp.post('/api/projects', { schema: createProjectRouteSchema }, async (_request, reply) => {
    return reply.code(501).send(buildProjectsStory0Message('POST /api/projects'));
  });

  typedApp.get(
    '/api/projects/:projectId',
    { schema: getProjectShellRouteSchema },
    async (_request, reply) => {
      return reply.code(501).send(buildProjectsStory0Message('GET /api/projects/:projectId'));
    },
  );

  typedApp.post(
    '/api/projects/:projectId/processes',
    { schema: createProcessRouteSchema },
    async (_request, reply) => {
      return reply
        .code(501)
        .send(buildProjectsStory0Message('POST /api/projects/:projectId/processes'));
    },
  );
}

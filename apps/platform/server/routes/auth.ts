import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  authMeRouteSchema,
  buildAuthStory0Message,
  loginRouteSchema,
  logoutRouteSchema,
} from '../schemas/auth.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get('/auth/login', { schema: loginRouteSchema }, async (_request, reply) => {
    return reply
      .code(501)
      .type('text/plain')
      .send('Story 0 scaffold: /auth/login exists but interactive auth is not implemented yet.');
  });

  typedApp.get('/auth/callback', { schema: loginRouteSchema }, async (_request, reply) => {
    return reply
      .code(501)
      .type('text/plain')
      .send('Story 0 scaffold: /auth/callback exists but interactive auth is not implemented yet.');
  });

  typedApp.get('/auth/me', { schema: authMeRouteSchema }, async (_request, reply) => {
    return reply.code(501).send(buildAuthStory0Message('GET /auth/me'));
  });

  typedApp.post(
    '/auth/logout',
    {
      schema: logoutRouteSchema,
      onRequest: [app.csrfProtection],
    },
    async (_request, reply) => {
      return reply.code(501).send(buildAuthStory0Message('POST /auth/logout'));
    },
  );
}

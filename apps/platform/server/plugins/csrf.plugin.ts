import fastifyCsrfProtection from '@fastify/csrf-protection';
import fp from 'fastify-plugin';

export const csrfPlugin = fp(
  async (app) => {
    await app.register(fastifyCsrfProtection, {
      cookieOpts: {
        path: '/',
        sameSite: 'lax',
        signed: true,
      },
    });
  },
  {
    name: 'story0-csrf-plugin',
  },
);

import fastifyCookie from '@fastify/cookie';
import fp from 'fastify-plugin';

export interface CookiesPluginOptions {
  secret: string;
}

export const cookiesPlugin = fp<CookiesPluginOptions>(
  async (app, options) => {
    await app.register(fastifyCookie, {
      secret: options.secret,
    });
  },
  {
    name: 'story0-cookies-plugin',
  },
);

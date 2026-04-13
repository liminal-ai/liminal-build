import { createApp } from './app.js';
import { loadServerEnv } from './config.js';

async function main(): Promise<void> {
  const env = loadServerEnv();
  const app = await createApp({
    env,
    logger: true,
  });

  await app.listen({
    host: '0.0.0.0',
    port: env.PORT,
  });
}

void main().catch((error) => {
  console.error('Failed to start the Story 0 platform scaffold.', error);
  process.exitCode = 1;
});

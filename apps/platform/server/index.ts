import { createApp } from './app.js';
import { loadServerEnv } from './config.js';
import { loadWorkspaceEnvFiles } from './load-workspace-env.js';

async function main(): Promise<void> {
  loadWorkspaceEnvFiles();
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
  console.error('Failed to start the Epic 1 platform server.', error);
  process.exitCode = 1;
});

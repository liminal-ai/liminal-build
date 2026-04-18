import { Daytona } from '@daytonaio/sdk';
import { loadServerEnv } from '../config.js';
import { loadWorkspaceEnvFiles } from '../load-workspace-env.js';

async function main(): Promise<void> {
  loadWorkspaceEnvFiles(import.meta.url);
  const env = loadServerEnv();

  const daytona = new Daytona({
    apiKey: env.DAYTONA_API_KEY,
    apiUrl: env.DAYTONA_API_URL,
    target: env.DAYTONA_TARGET,
  });

  const sandbox = await daytona.create(
    {
      language: 'typescript',
    },
    { timeout: 60 },
  );

  try {
    const response = await sandbox.process.executeCommand(
      'echo "daytona-smoke-ok"',
      undefined,
      undefined,
      30,
    );

    if (response.exitCode !== 0 || !response.result.includes('daytona-smoke-ok')) {
      throw new Error(
        `Daytona smoke command failed. exitCode=${response.exitCode}, stdout=${JSON.stringify(response.result)}`,
      );
    }

    console.log(`Daytona smoke passed. sandboxId=${sandbox.id}`);
  } finally {
    await sandbox.delete(60);
  }
}

void main().catch((error) => {
  console.error('Daytona smoke failed.', error);
  process.exitCode = 1;
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { createApp } from './app.js';
import { loadServerEnv } from './config.js';

function findWorkspaceRoot(startDirectory: string): string {
  let currentDirectory = startDirectory;

  while (true) {
    const workspaceMarker = path.join(currentDirectory, 'pnpm-workspace.yaml');

    if (fs.existsSync(workspaceMarker)) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return startDirectory;
    }

    currentDirectory = parentDirectory;
  }
}

function loadWorkspaceEnvFiles(): void {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = findWorkspaceRoot(currentDir);
  const fileValues: Record<string, string> = {};

  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(workspaceRoot, fileName);

    if (fs.existsSync(filePath)) {
      Object.assign(fileValues, parseEnv(fs.readFileSync(filePath, 'utf8')));
    }
  }

  for (const [key, value] of Object.entries(fileValues)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

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
  console.error('Failed to start the Story 0 platform scaffold.', error);
  process.exitCode = 1;
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

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

export function loadWorkspaceEnvFiles(currentDirUrl: string | URL = import.meta.url): void {
  const currentDir = path.dirname(fileURLToPath(currentDirUrl));
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

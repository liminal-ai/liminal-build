import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

const scriptDir: string = path.dirname(fileURLToPath(import.meta.url));
const rootDir: string = path.resolve(scriptDir, '..');
const envFile: string = path.join(rootDir, '.env.local');

if (!fs.existsSync(envFile)) {
  console.error(`ERROR: ${envFile} not found. Cannot determine Convex ports.`);
  process.exit(1);
}

const env: Record<string, string> = parseEnv(fs.readFileSync(envFile, 'utf8'));

const convexUrl: string | undefined = env['CONVEX_URL'];
const siteUrl: string | undefined = env['CONVEX_SITE_URL'];

function extractPort(url: string | undefined, name: string): string {
  if (!url) {
    console.error(`ERROR: ${name} not found in ${envFile}`);
    process.exit(1);
  }
  const match: RegExpMatchArray | null = url.match(/:(\d+)\s*$/);
  if (!match) {
    console.error(`ERROR: Could not parse port from ${name}=${url}`);
    process.exit(1);
  }
  return match[1];
}

const cloudPort: string = extractPort(convexUrl, 'CONVEX_URL');
const sitePort: string = extractPort(siteUrl, 'CONVEX_SITE_URL');

console.log(`Starting Convex local backend on ports ${cloudPort}/${sitePort}`);

const isWindows: boolean = process.platform === 'win32';
const cmd: string = isWindows ? 'pnpm.cmd' : 'pnpm';

const child = spawn(cmd, [
  'exec', 'convex', 'dev',
  '--configure', 'existing',
  '--team', 'lee-moore',
  '--project', 'liminal-build',
  '--dev-deployment', 'local',
  '--local-cloud-port', cloudPort,
  '--local-site-port', sitePort,
  ...process.argv.slice(2),
], {
  stdio: 'inherit',
  cwd: rootDir,
});

child.on('exit', (code: number | null) => {
  process.exit(code ?? 1);
});

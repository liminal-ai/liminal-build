type RuntimeProcess = {
  env?: Record<string, string | undefined>;
};

function readRuntimeEnv(key: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: RuntimeProcess;
  };
  return runtime.process?.env?.[key];
}

export function assertValidApiKey(apiKey: string): void {
  const configuredApiKey = readRuntimeEnv('CONVEX_API_KEY');

  if (configuredApiKey === undefined || configuredApiKey.length === 0) {
    throw new Error('CONVEX_API_KEY is not configured in Convex.');
  }

  if (apiKey !== configuredApiKey) {
    throw new Error('Unauthorized service API key.');
  }
}

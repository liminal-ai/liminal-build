import type {
  ExecutionResult,
  ProviderAdapter,
  ProviderKind,
  ScriptPayload,
} from './provider-adapter.js';
import type { ProviderAdapterRegistry } from './provider-adapter-registry.js';

const defaultScriptSource = `// liminal-build default execution placeholder.
// Writes a completed ExecutionResult with empty side effects.
// Per-process-type orchestration (Epic 3 out of scope) will replace this.
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
const result = {
  processStatus: 'completed',
  processHistoryItems: [],
  outputWrites: [],
  sideWorkWrites: [],
  artifactCheckpointCandidates: [],
  codeCheckpointCandidates: [],
};
await fs.writeFile(
  path.join(process.cwd(), '_liminal_exec_result.json'),
  JSON.stringify(result, null, 2),
  'utf8',
);
`;

export function buildDefaultScriptPayload(): ScriptPayload {
  return {
    format: 'ts-module-source',
    entrypoint: 'default',
    source: defaultScriptSource,
  };
}

/**
 * Thin wrapper around `ProviderAdapter.executeScript` that packages the
 * current scriptPayload (default placeholder for Epic 3; process-type-specific
 * payloads come later) and resolves the correct provider adapter from the
 * registry.
 */
export class ScriptExecutionService {
  constructor(
    private readonly providerAdapterRegistry: ProviderAdapterRegistry,
    private readonly scriptPayloadFactory: () => ScriptPayload = buildDefaultScriptPayload,
  ) {}

  async executeFor(args: {
    providerKind: ProviderKind;
    environmentId: string;
  }): Promise<ExecutionResult> {
    const adapter: ProviderAdapter = this.providerAdapterRegistry.resolve(args.providerKind);
    return adapter.executeScript({
      environmentId: args.environmentId,
      scriptPayload: this.scriptPayloadFactory(),
    });
  }
}

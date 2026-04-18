import type {
  ExecutionResult,
  ProviderAdapter,
  ProviderKind,
  ScriptPayload,
} from './provider-adapter.js';
import type { ProviderAdapterRegistry } from './provider-adapter-registry.js';

const defaultScriptSource = `// liminal-build default execution placeholder.
// Produces a small, reviewable artifact plus minimal process-facing side
// effects so the shared environment lane is visibly useful before
// process-type-specific orchestration lands.
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
const now = new Date().toISOString();
const artifactRelativePath = 'artifacts/default-execution-summary.md';
const artifactAbsolutePath = path.join(process.cwd(), artifactRelativePath);
const artifactContents = [
  '# Default Execution Summary',
  '',
  'This is the shared Epic 3 placeholder execution payload.',
  'The provider, hydration, execution, and checkpoint lanes are working.',
  '',
  \`Generated: \${now}\`,
].join('\\n');
await fs.mkdir(path.dirname(artifactAbsolutePath), { recursive: true });
await fs.writeFile(artifactAbsolutePath, artifactContents, 'utf8');
const result = {
  processStatus: 'completed',
  processHistoryItems: [
    {
      historyItemId: \`default-execution-history-\${now}\`,
      kind: 'process_event',
      lifecycleState: 'finalized',
      text: 'Default execution completed and generated a review-ready artifact.',
      createdAt: now,
      relatedSideWorkId: null,
      relatedArtifactId: null,
    },
  ],
  outputWrites: [
    {
      displayName: 'Default Execution Summary',
      revisionLabel: 'default-v1',
      linkedArtifactId: null,
      state: 'ready_for_review',
      updatedAt: now,
    },
  ],
  sideWorkWrites: [
    {
      displayLabel: 'Environment validation',
      purposeSummary: 'Validate the shared environment execution lane.',
      status: 'completed',
      resultSummary: 'Execution placeholder completed successfully.',
      updatedAt: now,
    },
  ],
  artifactCheckpointCandidates: [
    {
      artifactId: undefined,
      displayName: 'Default Execution Summary',
      revisionLabel: 'default-v1',
      contentsRef: artifactRelativePath,
    },
  ],
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

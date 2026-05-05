import type {
  ExecutionResult,
  ProviderAdapter,
  ProviderKind,
  ScriptPayload,
} from './provider-adapter.js';
import type { ProviderAdapterRegistry } from './provider-adapter-registry.js';
import type { HydrationPlanSourceInput } from './provider-adapter.js';

type DefaultScriptSourceInput = Pick<
  HydrationPlanSourceInput,
  'sourceAttachmentId' | 'displayName' | 'targetRef' | 'accessMode'
>;

function buildDefaultScriptSource(args: { sourceInputs: DefaultScriptSourceInput[] }): string {
  return `// liminal-build default execution payload.
// Produces a reviewable artifact and, when a writable source is present,
// exercises the durable code-update provenance path with one small checkpoint.
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
const sourceInputs = ${JSON.stringify(args.sourceInputs)};
const now = new Date().toISOString();
const artifactRelativePath = 'artifacts/default-execution-summary.md';
const artifactAbsolutePath = path.join(process.cwd(), artifactRelativePath);
const writableSource = sourceInputs.find((source) => source.accessMode === 'read_write') ?? null;
const informingSource = writableSource ?? sourceInputs[0] ?? null;
const sanitizeSegment = (raw) => {
  const trimmed = raw.trim();
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return replaced.length === 0 ? 'unnamed' : replaced;
};
const resolveSourceWorkspaceRef = async (source, filePath) => {
  const sourceDirCandidates = [
    path.join(
      'sources',
      \`\${sanitizeSegment(source.sourceAttachmentId)}-\${sanitizeSegment(source.displayName)}\`,
    ),
    path.join(
      'sources',
      \`\${sanitizeSegment(source.displayName)}-\${sanitizeSegment(source.sourceAttachmentId)}\`,
    ),
  ];
  for (const relativePath of sourceDirCandidates) {
    try {
      await fs.access(path.join(process.cwd(), relativePath));
      return path.join(relativePath, filePath);
    } catch {}
  }
  return path.join(sourceDirCandidates[0], filePath);
};
const artifactContents = [
  '# Default Execution Summary',
  '',
  'This is the shared default execution payload.',
  'The provider, hydration, execution, and checkpoint lanes are working.',
  '',
  \`Generated: \${now}\`,
  \`Used source: \${informingSource?.displayName ?? 'none'}\`,
].join('\\n');
await fs.mkdir(path.dirname(artifactAbsolutePath), { recursive: true });
await fs.writeFile(artifactAbsolutePath, artifactContents, 'utf8');
const codeCheckpointCandidates = [];
if (writableSource !== null) {
  const codeFilePath = 'liminal-build-default-execution-note.md';
  const workspaceRef = await resolveSourceWorkspaceRef(writableSource, codeFilePath);
  const workspacePath = path.join(process.cwd(), workspaceRef);
  const codeContents = [
    '# Default Execution Note',
    '',
    \`Generated: \${now}\`,
    \`Source: \${writableSource.displayName}\`,
  ].join('\\n');
  await fs.mkdir(path.dirname(workspacePath), { recursive: true });
  await fs.writeFile(workspacePath, codeContents, 'utf8');
  codeCheckpointCandidates.push({
    sourceAttachmentId: writableSource.sourceAttachmentId,
    displayName: writableSource.displayName,
    targetRef: writableSource.targetRef,
    accessMode: writableSource.accessMode,
    workspaceRef,
    filePath: codeFilePath,
    commitMessage: 'Record default execution note',
  });
}
const result = {
  processStatus: 'completed',
  processHistoryItems: [
    {
      historyItemId: \`default-execution-history-\${now}\`,
      kind: 'process_event',
      lifecycleState: 'finalized',
      text: 'Default execution completed and generated review-ready outputs.',
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
      resultSummary:
        writableSource === null
          ? 'Execution placeholder completed without a writable source checkpoint.'
          : 'Execution placeholder completed and staged a writable source checkpoint.',
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
  codeCheckpointCandidates,
  usedSourceAttachmentIds: informingSource === null ? [] : [informingSource.sourceAttachmentId],
};
await fs.writeFile(
  path.join(process.cwd(), '_liminal_exec_result.json'),
  JSON.stringify(result, null, 2),
  'utf8',
);
`;
}

export function buildDefaultScriptPayload(
  args: {
    sourceInputs?: Array<
      Pick<
        HydrationPlanSourceInput,
        'sourceAttachmentId' | 'displayName' | 'targetRef' | 'accessMode'
      >
    >;
  } = {},
): ScriptPayload {
  const sourceInputs: DefaultScriptSourceInput[] = [...(args.sourceInputs ?? [])];
  return {
    format: 'ts-module-source',
    entrypoint: 'default',
    source: buildDefaultScriptSource({
      sourceInputs,
    }),
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
    private readonly scriptPayloadFactory: (args: {
      currentSources: Array<
        Pick<
          HydrationPlanSourceInput,
          'sourceAttachmentId' | 'displayName' | 'targetRef' | 'accessMode'
        >
      >;
    }) => ScriptPayload = ({ currentSources }) =>
      buildDefaultScriptPayload({
        sourceInputs: currentSources,
      }),
  ) {}

  async executeFor(args: {
    providerKind: ProviderKind;
    environmentId: string;
    currentSources?: Array<
      Pick<
        HydrationPlanSourceInput,
        'sourceAttachmentId' | 'displayName' | 'targetRef' | 'accessMode'
      >
    >;
  }): Promise<ExecutionResult> {
    const adapter: ProviderAdapter = this.providerAdapterRegistry.resolve(args.providerKind);
    return adapter.executeScript({
      environmentId: args.environmentId,
      scriptPayload: this.scriptPayloadFactory({
        currentSources: args.currentSources ?? [],
      }),
    });
  }
}

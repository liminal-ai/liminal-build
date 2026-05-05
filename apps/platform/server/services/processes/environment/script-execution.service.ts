import type { ProcessSummary } from '../../../../shared/contracts/index.js';
import type {
  ExecutionResult,
  HydrationPlanSourceInput,
  ProviderAdapter,
  ProviderKind,
  ScriptPayload,
} from './provider-adapter.js';
import type { ProviderAdapterRegistry } from './provider-adapter-registry.js';

type DefaultExecutionSourceInput = Pick<
  HydrationPlanSourceInput,
  'sourceAttachmentId' | 'displayName' | 'targetRef' | 'accessMode'
>;

function buildIntegratedWorkspaceExecutionSource(args: {
  processContext?: Pick<ProcessSummary, 'processId' | 'displayLabel' | 'processType' | 'status'>;
  sourceInputs: DefaultExecutionSourceInput[];
}): string {
  return `// liminal-build integrated default execution payload.
// Reads hydrated runtime materials, synthesizes a summary artifact, and when
// possible stages a source-side note from the real execution path.
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
const processContext = ${JSON.stringify(args.processContext ?? null)};
const sourceInputs = ${JSON.stringify(args.sourceInputs)};
const now = new Date().toISOString();
const runtimeProfileByProcessType = {
  ProductDefinition: {
    artifactTitle: 'Product Definition Runtime Brief',
    artifactDisplayName: 'Product Definition Runtime Brief',
    artifactSlug: 'product-definition-runtime-brief',
    sourceNoteFilePath: 'notes/liminal-product-definition-runtime.md',
    revisionLabel: 'product-definition-runtime-v1',
    sideWorkLabel: 'Product definition runtime synthesis',
    executionFocus: 'shape hydrated discovery and product context into a product-definition brief',
    historyText: 'Product definition runtime completed and recorded hydrated discovery outputs.',
    sourceNoteTitle: 'Product Definition Runtime Note',
    commitMessage: 'Record product definition runtime note',
  },
  FeatureSpecification: {
    artifactTitle: 'Feature Specification Runtime Brief',
    artifactDisplayName: 'Feature Specification Runtime Brief',
    artifactSlug: 'feature-specification-runtime-brief',
    sourceNoteFilePath: 'notes/liminal-feature-specification-runtime.md',
    revisionLabel: 'feature-specification-runtime-v1',
    sideWorkLabel: 'Feature specification runtime synthesis',
    executionFocus: 'turn hydrated product and source context into a specification-readiness brief',
    historyText: 'Feature specification runtime completed and recorded hydrated specification outputs.',
    sourceNoteTitle: 'Feature Specification Runtime Note',
    commitMessage: 'Record feature specification runtime note',
  },
  FeatureImplementation: {
    artifactTitle: 'Feature Implementation Runtime Brief',
    artifactDisplayName: 'Feature Implementation Runtime Brief',
    artifactSlug: 'feature-implementation-runtime-brief',
    sourceNoteFilePath: 'notes/liminal-feature-implementation-runtime.md',
    revisionLabel: 'feature-implementation-runtime-v1',
    sideWorkLabel: 'Feature implementation runtime synthesis',
    executionFocus: 'inspect hydrated specs and source worktrees for implementation-ready context',
    historyText: 'Feature implementation runtime completed and recorded hydrated implementation outputs.',
    sourceNoteTitle: 'Feature Implementation Runtime Note',
    commitMessage: 'Record feature implementation runtime note',
  },
};
const genericRuntimeProfile = {
  artifactTitle: 'Process Runtime Brief',
  artifactDisplayName: 'Process Runtime Brief',
  artifactSlug: 'process-runtime-brief',
  sourceNoteFilePath: 'notes/liminal-process-runtime.md',
  revisionLabel: 'process-runtime-v1',
  sideWorkLabel: 'Process runtime synthesis',
  executionFocus: 'synthesize process context from hydrated materials',
  historyText: 'Process runtime completed and recorded hydrated workspace outputs.',
  sourceNoteTitle: 'Process Runtime Note',
  commitMessage: 'Record process runtime note',
};
const runtimeProfile =
  processContext === null
    ? genericRuntimeProfile
    : runtimeProfileByProcessType[processContext.processType] ?? genericRuntimeProfile;
const artifactRelativePath = \`artifacts/\${runtimeProfile.artifactSlug}.md\`;
const artifactAbsolutePath = path.join(process.cwd(), artifactRelativePath);
const sourceNoteFilePath = runtimeProfile.sourceNoteFilePath;
const runtimeAuditRelativePath = '_liminal_runtime_audit.json';
const writableSource = sourceInputs.find((source) => source.accessMode === 'read_write') ?? null;
const primarySource = writableSource ?? sourceInputs[0] ?? null;
const usedSourceAttachmentIds = sourceInputs.map((source) => source.sourceAttachmentId);
const sanitizeSegment = (raw) => {
  const trimmed = raw.trim();
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return replaced.length === 0 ? 'unnamed' : replaced;
};
const listDirectoryEntriesSafe = async (relativeDir) => {
  try {
    return await fs.readdir(path.join(process.cwd(), relativeDir), { withFileTypes: true });
  } catch {
    return [];
  }
};
const readTextSafe = async (relativePath) => {
  try {
    return await fs.readFile(path.join(process.cwd(), relativePath), 'utf8');
  } catch {
    return null;
  }
};
const summarizeText = (text) => {
  if (text === null) {
    return null;
  }
  const normalized = text.replace(/\\s+/g, ' ').trim();
  return normalized.length === 0 ? null : normalized.slice(0, 180);
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
const hydratedArtifacts = (await listDirectoryEntriesSafe('artifacts')).filter((entry) =>
  entry.isFile(),
);
const hydratedSources = (await listDirectoryEntriesSafe('sources')).filter((entry) =>
  entry.isDirectory(),
);
const runtimeAudit = {
  generatedAt: now,
  processId: processContext?.processId ?? null,
  processType: processContext?.processType ?? null,
  runtimeProfile: runtimeProfile.artifactSlug,
  executionFocus: runtimeProfile.executionFocus,
  observedArtifactFileCount: hydratedArtifacts.length,
  observedSourceWorkspaceCount: hydratedSources.length,
  writableSourceAttachmentIds: sourceInputs
    .filter((source) => source.accessMode === 'read_write')
    .map((source) => source.sourceAttachmentId),
  usedSourceAttachmentIds,
};
const artifactObservations = await Promise.all(
  hydratedArtifacts.slice(0, 6).map(async (entry) => {
    const relativePath = path.join('artifacts', entry.name);
    return {
      fileName: entry.name,
      excerpt: summarizeText(await readTextSafe(relativePath)),
    };
  }),
);
const sourceObservations = await Promise.all(
  hydratedSources.slice(0, 6).map(async (entry) => {
    const relativeSourceDir = path.join('sources', entry.name);
    const childEntries = await listDirectoryEntriesSafe(relativeSourceDir);
    const topLevelFiles = childEntries.filter((child) => child.isFile()).slice(0, 6);
    const firstReadableFile = topLevelFiles[0] ?? null;
    const excerpt =
      firstReadableFile === null
        ? null
        : summarizeText(await readTextSafe(path.join(relativeSourceDir, firstReadableFile.name)));
    return {
      directory: entry.name,
      fileCount: childEntries.length,
      sampleEntries: childEntries.slice(0, 6).map((child) => child.name),
      excerpt,
    };
  }),
);
const artifactSummaryLines = [
  \`# \${runtimeProfile.artifactTitle}\`,
  '',
  'This brief was generated by the integrated runtime path from hydrated process materials.',
  '',
  \`Process: \${processContext?.displayLabel ?? 'unknown process'}\`,
  \`Process type: \${processContext?.processType ?? 'unknown'}\`,
  \`Process status at start: \${processContext?.status ?? 'unknown'}\`,
  \`Runtime focus: \${runtimeProfile.executionFocus}\`,
  \`Generated: \${now}\`,
  \`Hydrated artifact files: \${artifactObservations.length}\`,
  \`Hydrated source worktrees: \${sourceObservations.length}\`,
  \`Primary source: \${primarySource?.displayName ?? 'none'}\`,
  '',
  'Observed artifacts:',
  ...(artifactObservations.length === 0
    ? ['- none']
    : artifactObservations.map(
        (observation) =>
          \`- \${observation.fileName}: \${observation.excerpt ?? 'no readable preview'}\`,
      )),
  '',
  'Observed source worktrees:',
  ...(sourceObservations.length === 0
    ? ['- none']
    : sourceObservations.map((observation) => {
        const preview =
          observation.excerpt === null ? '' : \` | preview: \${observation.excerpt}\`;
        return \`- \${observation.directory}: \${observation.fileCount} entries (\${observation.sampleEntries.join(', ') || 'no visible files'})\${preview}\`;
      })),
].join('\\n');
await fs.mkdir(path.dirname(artifactAbsolutePath), { recursive: true });
await fs.writeFile(artifactAbsolutePath, artifactSummaryLines, 'utf8');
const codeCheckpointCandidates = [];
if (writableSource !== null) {
  const workspaceRef = await resolveSourceWorkspaceRef(writableSource, sourceNoteFilePath);
  const workspacePath = path.join(process.cwd(), workspaceRef);
  const sourceNoteContents = [
    \`# \${runtimeProfile.sourceNoteTitle}\`,
    '',
    \`Generated: \${now}\`,
    \`Process type: \${processContext?.processType ?? 'unknown'}\`,
    \`Runtime focus: \${runtimeProfile.executionFocus}\`,
    \`Source: \${writableSource.displayName}\`,
    \`Observed source worktrees: \${sourceObservations.length}\`,
    \`Observed artifact files: \${artifactObservations.length}\`,
    \`Summary artifact: \${artifactRelativePath}\`,
  ].join('\\n');
  await fs.mkdir(path.dirname(workspacePath), { recursive: true });
  await fs.writeFile(workspacePath, sourceNoteContents, 'utf8');
  codeCheckpointCandidates.push({
    sourceAttachmentId: writableSource.sourceAttachmentId,
    displayName: writableSource.displayName,
    targetRef: writableSource.targetRef,
    accessMode: writableSource.accessMode,
    workspaceRef,
    filePath: sourceNoteFilePath,
    commitMessage: runtimeProfile.commitMessage,
  });
}
const result = {
  processStatus: 'completed',
  processHistoryItems: [
    {
      historyItemId: \`default-execution-history-\${now}\`,
      kind: 'process_event',
      lifecycleState: 'finalized',
      text: runtimeProfile.historyText,
      createdAt: now,
      relatedSideWorkId: null,
      relatedArtifactId: null,
    },
  ],
  archiveEntries: [],
  outputWrites: [
    {
      displayName: runtimeProfile.artifactDisplayName,
      revisionLabel: runtimeProfile.revisionLabel,
      linkedArtifactId: null,
      state: 'ready_for_review',
      updatedAt: now,
    },
  ],
  sideWorkWrites: [
    {
      displayLabel: runtimeProfile.sideWorkLabel,
      purposeSummary: \`\${runtimeProfile.executionFocus}, write a typed runtime brief, and stage source follow-up when possible.\`,
      status: 'completed',
      resultSummary:
        writableSource === null
          ? \`Synthesized a summary from \${artifactObservations.length} artifact files and \${sourceObservations.length} source worktrees without a writable source note.\`
          : \`Synthesized a summary from \${artifactObservations.length} artifact files and \${sourceObservations.length} source worktrees, then staged a writable source note.\`,
      updatedAt: now,
    },
  ],
  artifactCheckpointCandidates: [
    {
      artifactId: undefined,
      displayName: runtimeProfile.artifactDisplayName,
      revisionLabel: runtimeProfile.revisionLabel,
      contentsRef: artifactRelativePath,
    },
  ],
  codeCheckpointCandidates,
  usedSourceAttachmentIds,
};
await fs.writeFile(
  path.join(process.cwd(), runtimeAuditRelativePath),
  JSON.stringify(runtimeAudit, null, 2),
  'utf8',
);
await fs.writeFile(
  path.join(process.cwd(), '_liminal_exec_result.json'),
  JSON.stringify(result, null, 2),
  'utf8',
);
`;
}

export function buildIntegratedWorkspaceExecutionPayload(
  args: {
    processContext?: Pick<ProcessSummary, 'processId' | 'displayLabel' | 'processType' | 'status'>;
    sourceInputs?: Array<
      Pick<
        HydrationPlanSourceInput,
        'sourceAttachmentId' | 'displayName' | 'targetRef' | 'accessMode'
      >
    >;
  } = {},
): ScriptPayload {
  const sourceInputs: DefaultExecutionSourceInput[] = [...(args.sourceInputs ?? [])];
  return {
    format: 'ts-module-source',
    entrypoint: 'default',
    source: buildIntegratedWorkspaceExecutionSource({
      processContext: args.processContext,
      sourceInputs,
    }),
  };
}

/**
 * Thin wrapper around `ProviderAdapter.executeScript` that packages the
 * current integrated default execution payload and resolves the correct
 * provider adapter from the registry. The default payload may produce runtime
 * artifacts/checkpoint candidates, but it must not synthesize canonical archive
 * entries; archive rows should come from real process-specific execution.
 */
export class ScriptExecutionService {
  constructor(
    private readonly providerAdapterRegistry: ProviderAdapterRegistry,
    private readonly scriptPayloadFactory: (args: {
      processContext?: Pick<
        ProcessSummary,
        'processId' | 'displayLabel' | 'processType' | 'status'
      >;
      currentSources: Array<
        Pick<
          HydrationPlanSourceInput,
          'sourceAttachmentId' | 'displayName' | 'targetRef' | 'accessMode'
        >
      >;
    }) => ScriptPayload = ({ processContext, currentSources }) =>
      buildIntegratedWorkspaceExecutionPayload({
        processContext,
        sourceInputs: currentSources,
      }),
  ) {}

  async executeFor(args: {
    providerKind: ProviderKind;
    environmentId: string;
    processContext?: Pick<ProcessSummary, 'processId' | 'displayLabel' | 'processType' | 'status'>;
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
        processContext: args.processContext,
        currentSources: args.currentSources ?? [],
      }),
    });
  }
}

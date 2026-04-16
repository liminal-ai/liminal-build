import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { PlatformStore } from '../../projects/platform-store.js';
import type {
  ArtifactCheckpointCandidate,
  CodeCheckpointCandidate,
  EnsureEnvironmentArgs,
  EnsuredEnvironment,
  ExecuteEnvironmentScriptArgs,
  ExecutionResult,
  HydrationPlan,
  HydrationResult,
  ProcessExecutionStatus,
  ProviderAdapter,
  ProviderKind,
} from './provider-adapter.js';

export const DEFAULT_LOCAL_WORKSPACE_ROOT_SUFFIX = 'liminal-build-sandboxes';
export const SCRIPT_ENTRYPOINT_FILENAME = '_liminal_exec.ts';
export const SCRIPT_RESULT_FILENAME = '_liminal_exec_result.json';
export const ARTIFACTS_SUBDIR = 'artifacts';
export const SOURCES_SUBDIR = 'sources';

export interface LocalProviderRuntime {
  /**
   * Runs `git clone` (or equivalent) for a source attachment. Returns `null`
   * on success, or an error message string on failure. Defaults to spawning
   * the system `git` binary; overridable for unit tests to avoid network IO.
   */
  cloneSource(args: {
    repoUrl: string;
    targetRef: string | null;
    destination: string;
  }): Promise<string | null>;

  /**
   * Executes the bootstrap TS script in the working tree. Returns the child
   * process exit code. Defaults to `node --experimental-strip-types`.
   */
  runScript(args: { workingTree: string; scriptPath: string }): Promise<number>;
}

export interface LocalProviderAdapterOptions {
  workspaceRoot?: string;
  runtime?: LocalProviderRuntime;
}

const defaultRuntime: LocalProviderRuntime = {
  async cloneSource(args) {
    return new Promise<string | null>((resolve) => {
      const clone = spawn(
        'git',
        [
          'clone',
          '--depth',
          '1',
          ...(args.targetRef === null ? [] : ['--branch', args.targetRef]),
          args.repoUrl,
          args.destination,
        ],
        { stdio: 'pipe' },
      );
      let stderr = '';
      clone.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      clone.on('error', (err: Error) => {
        resolve(`git clone failed to spawn: ${err.message}`);
      });
      clone.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(null);
          return;
        }
        resolve(
          `git clone exited with code ${code ?? 'unknown'}: ${stderr.trim() || '(no stderr)'}`,
        );
      });
    });
  },
  async runScript(args) {
    return new Promise<number>((resolve) => {
      const child = spawn('node', ['--experimental-strip-types', args.scriptPath], {
        cwd: args.workingTree,
        stdio: 'pipe',
      });
      child.on('error', () => {
        resolve(1);
      });
      child.on('close', (code: number | null) => {
        resolve(code ?? 1);
      });
    });
  },
};

/**
 * Local-runtime provider adapter. Implements the full `ProviderAdapter`
 * contract against the local filesystem so the execution lane is real on
 * trusted developer machines.
 *
 * Working trees live under a configurable root (default
 * `os.tmpdir()/liminal-build-sandboxes`, overridable via
 * `LOCAL_PROVIDER_WORKSPACE_ROOT`).
 */
export class LocalProviderAdapter implements ProviderAdapter {
  readonly providerKind: ProviderKind = 'local';
  private readonly workspaceRoot: string;
  private readonly runtime: LocalProviderRuntime;
  private readonly environmentRoots = new Map<string, string>();
  private readonly environmentProcessIds = new Map<string, string>();

  constructor(
    private readonly platformStore: PlatformStore,
    options: LocalProviderAdapterOptions = {},
  ) {
    this.workspaceRoot =
      options.workspaceRoot ?? path.join(os.tmpdir(), DEFAULT_LOCAL_WORKSPACE_ROOT_SUFFIX);
    this.runtime = options.runtime ?? defaultRuntime;
  }

  async ensureEnvironment(args: EnsureEnvironmentArgs): Promise<EnsuredEnvironment> {
    const environmentId = `local-${args.processId}-${randomBytes(4).toString('hex')}`;
    const workingTree = path.join(this.workspaceRoot, environmentId);
    await fs.mkdir(workingTree, { recursive: true });
    this.environmentRoots.set(environmentId, workingTree);
    this.environmentProcessIds.set(environmentId, args.processId);
    return {
      providerKind: 'local',
      environmentId,
      workspaceHandle: workingTree,
    };
  }

  async hydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    const workingTree = this.resolveWorkingTree(args.environmentId);

    const artifactsDir = path.join(workingTree, ARTIFACTS_SUBDIR);
    const sourcesDir = path.join(workingTree, SOURCES_SUBDIR);
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.mkdir(sourcesDir, { recursive: true });

    for (const artifact of args.plan.artifactInputs) {
      const content = await this.platformStore.getArtifactContent({
        artifactId: artifact.artifactId,
      });

      if (content === null) {
        throw new Error(
          `Hydration failed: artifact ${artifact.artifactId} (${artifact.displayName}) has no retrievable content.`,
        );
      }

      const filename = safeFilenameForArtifact(artifact.displayName, artifact.artifactId);
      await fs.writeFile(path.join(artifactsDir, filename), content, 'utf8');
    }

    for (const source of args.plan.sourceInputs) {
      const destination = path.join(
        sourcesDir,
        safeFilenameForSource(source.displayName, source.sourceAttachmentId),
      );
      // Remove any prior clone so rehydrate is idempotent.
      await fs.rm(destination, { recursive: true, force: true });

      const error = await this.runtime.cloneSource({
        repoUrl: source.repositoryUrl,
        targetRef: source.targetRef,
        destination,
      });

      if (error !== null) {
        throw new Error(
          `Hydration failed: clone of ${source.displayName} (${source.sourceAttachmentId}) failed: ${error}`,
        );
      }
    }

    return {
      environmentId: args.environmentId,
      hydratedAt: new Date().toISOString(),
      fingerprint: args.plan.fingerprint,
    };
  }

  async executeScript(args: ExecuteEnvironmentScriptArgs): Promise<ExecutionResult> {
    const workingTree = this.resolveWorkingTree(args.environmentId);
    const scriptPath = path.join(workingTree, SCRIPT_ENTRYPOINT_FILENAME);
    const resultPath = path.join(workingTree, SCRIPT_RESULT_FILENAME);

    // Always start with a clean result file so we don't accidentally read a
    // prior invocation's output on failure.
    await fs.rm(resultPath, { force: true });
    await fs.writeFile(scriptPath, args.scriptPayload.source, 'utf8');

    const exitCode = await this.runtime.runScript({ workingTree, scriptPath });

    if (exitCode !== 0) {
      return buildFailureExecutionResult(`Script exited with non-zero code ${exitCode}.`);
    }

    let resultText: string;
    try {
      resultText = await fs.readFile(resultPath, 'utf8');
    } catch (error) {
      return buildFailureExecutionResult(
        `Script did not write expected result file '${SCRIPT_RESULT_FILENAME}': ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(resultText);
    } catch (error) {
      return buildFailureExecutionResult(
        `Script result file was not valid JSON: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    const validated = validateExecutionResult(parsed);
    if (!validated.ok) {
      return buildFailureExecutionResult(
        `Script result was not a valid ExecutionResult: ${validated.reason}`,
      );
    }

    const result = validated.value;
    const refValidation = await validateCandidateRefs({
      workingTree,
      artifactCandidates: result.artifactCheckpointCandidates,
      codeCandidates: result.codeCheckpointCandidates,
    });
    if (refValidation.ok) {
      return result;
    }
    return buildFailureExecutionResult(
      `Script declared an invalid checkpoint candidate path: ${refValidation.reason}`,
    );
  }

  async rehydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    return this.hydrateEnvironment(args);
  }

  async rebuildEnvironment(args: {
    processId: string;
    providerKind: ProviderKind;
    plan: HydrationPlan;
  }): Promise<HydrationResult & EnsuredEnvironment> {
    // Tear down any prior environment for this processId so we rebuild from a
    // clean working tree. Iterate a snapshot so we can mutate the map during
    // teardown.
    const priorEnvironmentIds = [...this.environmentProcessIds.entries()]
      .filter(([, processId]) => processId === args.processId)
      .map(([environmentId]) => environmentId);
    for (const environmentId of priorEnvironmentIds) {
      await this.teardownEnvironment({ environmentId });
    }

    const ensured = await this.ensureEnvironment({
      processId: args.processId,
      providerKind: args.providerKind,
    });
    const hydration = await this.hydrateEnvironment({
      environmentId: ensured.environmentId,
      plan: args.plan,
    });

    return {
      providerKind: ensured.providerKind,
      environmentId: ensured.environmentId,
      workspaceHandle: ensured.workspaceHandle,
      hydratedAt: hydration.hydratedAt,
      fingerprint: hydration.fingerprint,
    };
  }

  async teardownEnvironment(args: { environmentId: string }): Promise<void> {
    const workingTree = this.environmentRoots.get(args.environmentId);
    if (workingTree !== undefined) {
      await fs.rm(workingTree, { recursive: true, force: true });
      this.environmentRoots.delete(args.environmentId);
    }
    this.environmentProcessIds.delete(args.environmentId);
  }

  /**
   * Optional accessor used by the orchestrator's checkpoint stage to translate
   * `contentsRef` / `workspaceRef` paths into absolute filesystem paths inside
   * the working tree. Returns `null` if the environment is no longer tracked
   * (already torn down). Not part of the spec'd `ProviderAdapter` contract;
   * other adapters simply do not expose it.
   */
  getWorkspaceHandle(args: { environmentId: string }): string | null {
    return this.environmentRoots.get(args.environmentId) ?? null;
  }

  private resolveWorkingTree(environmentId: string): string {
    const tree = this.environmentRoots.get(environmentId);
    if (tree === undefined) {
      throw new Error(
        `LocalProviderAdapter has no working tree for environmentId '${environmentId}'. ensureEnvironment must run before hydrateEnvironment/executeScript.`,
      );
    }
    return tree;
  }
}

function sanitizeSegment(raw: string): string {
  const trimmed = raw.trim();
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return replaced.length === 0 ? 'unnamed' : replaced;
}

function safeFilenameForArtifact(displayName: string, artifactId: string): string {
  const base = sanitizeSegment(displayName);
  if (/\.[a-zA-Z0-9]+$/.test(base)) {
    return `${sanitizeSegment(artifactId)}-${base}`;
  }
  return `${sanitizeSegment(artifactId)}-${base}.md`;
}

function safeFilenameForSource(displayName: string, sourceAttachmentId: string): string {
  return `${sanitizeSegment(sourceAttachmentId)}-${sanitizeSegment(displayName)}`;
}

function buildFailureExecutionResult(reason: string): ExecutionResult {
  return {
    processStatus: 'failed',
    processHistoryItems: [
      {
        historyItemId: `local-provider-failure:${Date.now()}`,
        kind: 'process_event',
        lifecycleState: 'finalized',
        text: reason,
        createdAt: new Date().toISOString(),
        relatedSideWorkId: null,
        relatedArtifactId: null,
      },
    ],
    outputWrites: [],
    sideWorkWrites: [],
    artifactCheckpointCandidates: [],
    codeCheckpointCandidates: [],
  };
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; reason: string };

function validateExecutionResult(value: unknown): ValidationResult<ExecutionResult> {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, reason: 'Expected a JSON object.' };
  }
  const obj = value as Record<string, unknown>;
  const allowedStatuses: ProcessExecutionStatus[] = [
    'running',
    'waiting',
    'completed',
    'failed',
    'interrupted',
  ];
  if (
    typeof obj.processStatus !== 'string' ||
    !allowedStatuses.includes(obj.processStatus as ProcessExecutionStatus)
  ) {
    return { ok: false, reason: `Invalid processStatus: ${String(obj.processStatus)}` };
  }

  const arrayKeys: Array<keyof ExecutionResult> = [
    'processHistoryItems',
    'outputWrites',
    'sideWorkWrites',
    'artifactCheckpointCandidates',
    'codeCheckpointCandidates',
  ];

  for (const key of arrayKeys) {
    if (!Array.isArray(obj[key])) {
      return { ok: false, reason: `Field ${String(key)} must be an array.` };
    }
  }

  return {
    ok: true,
    value: {
      processStatus: obj.processStatus as ProcessExecutionStatus,
      processHistoryItems: obj.processHistoryItems as ExecutionResult['processHistoryItems'],
      outputWrites: obj.outputWrites as ExecutionResult['outputWrites'],
      sideWorkWrites: obj.sideWorkWrites as ExecutionResult['sideWorkWrites'],
      artifactCheckpointCandidates:
        obj.artifactCheckpointCandidates as ExecutionResult['artifactCheckpointCandidates'],
      codeCheckpointCandidates:
        obj.codeCheckpointCandidates as ExecutionResult['codeCheckpointCandidates'],
    },
  };
}

async function validateCandidateRefs(args: {
  workingTree: string;
  artifactCandidates: ArtifactCheckpointCandidate[];
  codeCandidates: CodeCheckpointCandidate[];
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Ensure each declared `contentsRef` and `workspaceRef` is a path inside the
  // working tree. We check that the path starts with the working tree root or
  // is a relative path resolvable from it.
  function normalize(reference: string): string | null {
    if (path.isAbsolute(reference)) {
      return path.resolve(reference);
    }
    // Disallow schemes (`mem://`, `git://`, etc.) in LocalProvider refs.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(reference)) {
      return null;
    }
    return path.resolve(args.workingTree, reference);
  }

  const absoluteRoot = path.resolve(args.workingTree);
  function isWithinWorkingTree(resolvedPath: string): boolean {
    const relative = path.relative(absoluteRoot, resolvedPath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  }

  async function assertExistingFile(
    resolvedPath: string,
    reason: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
      const stat = await fs.stat(resolvedPath);
      if (stat.isFile()) {
        return { ok: true };
      }
      return {
        ok: false,
        reason: `${reason} resolved to '${resolvedPath}', which is not a file.`,
      };
    } catch {
      return {
        ok: false,
        reason: `${reason} resolved to '${resolvedPath}', which does not exist.`,
      };
    }
  }

  for (const candidate of args.artifactCandidates) {
    const resolved = normalize(candidate.contentsRef);
    if (resolved === null || !isWithinWorkingTree(resolved)) {
      return {
        ok: false,
        reason: `artifactCheckpointCandidate '${candidate.artifactId}' contentsRef '${candidate.contentsRef}' is outside the working tree.`,
      };
    }
    const exists = await assertExistingFile(
      resolved,
      `artifactCheckpointCandidate '${candidate.artifactId}' contentsRef '${candidate.contentsRef}'`,
    );
    if (!exists.ok) {
      return exists;
    }
  }

  for (const candidate of args.codeCandidates) {
    const resolved = normalize(candidate.workspaceRef);
    if (resolved === null || !isWithinWorkingTree(resolved)) {
      return {
        ok: false,
        reason: `codeCheckpointCandidate '${candidate.sourceAttachmentId}' workspaceRef '${candidate.workspaceRef}' is outside the working tree.`,
      };
    }
    const exists = await assertExistingFile(
      resolved,
      `codeCheckpointCandidate '${candidate.sourceAttachmentId}' workspaceRef '${candidate.workspaceRef}'`,
    );
    if (!exists.ok) {
      return exists;
    }
  }

  return { ok: true };
}

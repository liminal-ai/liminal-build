import {
  Daytona,
  type DaytonaConfig,
  DaytonaAuthenticationError,
  DaytonaAuthorizationError,
  DaytonaConnectionError,
  DaytonaError,
  DaytonaNotFoundError,
  DaytonaTimeoutError,
} from '@daytonaio/sdk';
import type {
  EnsureEnvironmentArgs,
  EnsuredEnvironment,
  ExecuteEnvironmentScriptArgs,
  ExecutionResult,
  HydrationPlan,
  HydrationResult,
  ProviderAdapter,
  ProviderKind,
  ResolveCandidateContentsArgs,
} from './provider-adapter.js';
import { ProviderLifecycleError } from './provider-adapter.js';
import type { PlatformStore } from '../../projects/platform-store.js';

export const DAYTONA_WORKSPACE_ROOT = 'workspace';
export const DAYTONA_ARTIFACTS_SUBDIR = `${DAYTONA_WORKSPACE_ROOT}/artifacts`;
export const DAYTONA_SOURCES_SUBDIR = `${DAYTONA_WORKSPACE_ROOT}/sources`;
export const DAYTONA_SCRIPT_ENTRYPOINT = `${DAYTONA_WORKSPACE_ROOT}/_liminal_exec.ts`;
export const DAYTONA_SCRIPT_RESULT = `${DAYTONA_WORKSPACE_ROOT}/_liminal_exec_result.json`;
const DEFAULT_DAYTONA_TIMEOUT_SEC = 60;

export interface DaytonaClientLike {
  create(
    params?: {
      language?: string;
      envVars?: Record<string, string>;
      autoStopInterval?: number;
    },
    options?: { timeout?: number },
  ): Promise<DaytonaSandboxLike>;
  get(sandboxIdOrName: string): Promise<DaytonaSandboxLike>;
}

export interface DaytonaSandboxLike {
  id: string;
  state?: string;
  recoverable?: boolean;
  start(timeout?: number): Promise<void>;
  recover(timeout?: number): Promise<void>;
  delete(timeout?: number): Promise<void>;
  getUserHomeDir(): Promise<string | undefined>;
  fs: {
    createFolder(path: string, mode: string): Promise<void>;
    deleteFile(path: string, recursive?: boolean): Promise<void>;
    uploadFile(file: Buffer | string, remotePath: string, timeout?: number): Promise<void>;
    downloadFile(remotePath: string, timeout?: number): Promise<Buffer>;
    getFileDetails(path: string): Promise<unknown>;
  };
  git: {
    clone(
      url: string,
      path: string,
      branch?: string,
      commitId?: string,
      username?: string,
      password?: string,
    ): Promise<void>;
  };
  process: {
    executeCommand(
      command: string,
      cwd?: string,
      env?: Record<string, string>,
      timeout?: number,
    ): Promise<{ exitCode: number; result: string }>;
  };
}

export interface DaytonaProviderAdapterOptions {
  apiKey: string;
  apiUrl?: string;
  target?: string;
  gitHubToken?: string;
  sandboxTimeoutSec?: number;
  clientFactory?: (config: DaytonaConfig) => DaytonaClientLike;
}

/**
 * Hosted Daytona provider implementation. Uses the real Daytona SDK to create
 * and operate remote sandboxes while preserving the same ProviderAdapter
 * contract the Local adapter satisfies.
 */
export class DaytonaProviderAdapter implements ProviderAdapter {
  readonly providerKind: ProviderKind = 'daytona';
  private readonly client: DaytonaClientLike;
  private readonly gitHubToken: string | null;
  private readonly sandboxTimeoutSec: number;

  constructor(
    private readonly platformStore: PlatformStore,
    options: DaytonaProviderAdapterOptions,
  ) {
    if (typeof options.apiKey !== 'string' || options.apiKey.length === 0) {
      throw new Error('DaytonaProviderAdapter requires a non-empty DAYTONA_API_KEY.');
    }

    const config: DaytonaConfig = {
      apiKey: options.apiKey,
      apiUrl: options.apiUrl,
      target: options.target,
    };

    this.client =
      options.clientFactory?.(config) ?? (new Daytona(config) as unknown as DaytonaClientLike);
    this.gitHubToken = options.gitHubToken ?? null;
    this.sandboxTimeoutSec = options.sandboxTimeoutSec ?? DEFAULT_DAYTONA_TIMEOUT_SEC;
  }

  async ensureEnvironment(_args: EnsureEnvironmentArgs): Promise<EnsuredEnvironment> {
    try {
      const sandbox = await this.client.create(
        {
          language: 'typescript',
        },
        { timeout: this.sandboxTimeoutSec },
      );
      const workspaceHandle = await this.resolveWorkspaceRoot(sandbox);
      return {
        providerKind: 'daytona',
        environmentId: sandbox.id,
        workspaceHandle,
      };
    } catch (error) {
      throw this.wrapDaytonaError(error, 'unavailable', 'Daytona sandbox creation failed');
    }
  }

  async hydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    const sandbox = await this.getExistingSandbox(args.environmentId);
    await this.prepareWorkspaceLayout(sandbox);

    try {
      for (const artifact of args.plan.artifactInputs) {
        const contents = await this.platformStore.getArtifactContent({
          artifactId: artifact.artifactId,
        });

        if (contents === null) {
          throw new ProviderLifecycleError(
            'failed',
            `Hydration failed: artifact ${artifact.artifactId} (${artifact.displayName}) has no retrievable content.`,
          );
        }

        const remotePath = `${DAYTONA_ARTIFACTS_SUBDIR}/${safeFilenameForArtifact(
          artifact.displayName,
          artifact.artifactId,
        )}`;
        await sandbox.fs.uploadFile(
          Buffer.from(contents, 'utf8'),
          remotePath,
          this.sandboxTimeoutSec,
        );
      }

      for (const source of args.plan.sourceInputs) {
        const destination = `${DAYTONA_SOURCES_SUBDIR}/${safeFilenameForSource(
          source.displayName,
          source.sourceAttachmentId,
        )}`;
        await sandbox.fs.deleteFile(destination, true).catch(() => undefined);

        const cloneAuth = resolveCloneAuth(source.repositoryUrl, this.gitHubToken);
        await sandbox.git.clone(
          source.repositoryUrl,
          destination,
          source.targetRef ?? undefined,
          undefined,
          cloneAuth?.username,
          cloneAuth?.password,
        );
      }

      return {
        environmentId: args.environmentId,
        hydratedAt: new Date().toISOString(),
        fingerprint: args.plan.fingerprint,
      };
    } catch (error) {
      throw this.wrapDaytonaError(error, 'failed', 'Daytona hydration failed');
    }
  }

  async executeScript(args: ExecuteEnvironmentScriptArgs): Promise<ExecutionResult> {
    const sandbox = await this.getExistingSandbox(args.environmentId);
    await this.prepareWorkspaceLayout(sandbox);

    try {
      await sandbox.fs.deleteFile(DAYTONA_SCRIPT_RESULT, false).catch(() => undefined);
      await sandbox.fs.uploadFile(
        Buffer.from(args.scriptPayload.source, 'utf8'),
        DAYTONA_SCRIPT_ENTRYPOINT,
        this.sandboxTimeoutSec,
      );

      const response = await sandbox.process.executeCommand(
        'node --experimental-strip-types _liminal_exec.ts',
        DAYTONA_WORKSPACE_ROOT,
        undefined,
        this.sandboxTimeoutSec,
      );

      if (response.exitCode !== 0) {
        return buildFailureExecutionResult(
          `Script exited with non-zero code ${response.exitCode}: ${response.result || '(no stdout)'}`,
        );
      }

      let resultText: string;
      try {
        resultText = (
          await sandbox.fs.downloadFile(DAYTONA_SCRIPT_RESULT, this.sandboxTimeoutSec)
        ).toString('utf8');
      } catch (error) {
        throw new ProviderLifecycleError(
          'failed',
          `Script did not write expected result file '${DAYTONA_SCRIPT_RESULT}': ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(resultText);
      } catch (error) {
        throw new ProviderLifecycleError(
          'failed',
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

      const refValidation = await validateRemoteCandidateRefs({
        sandbox,
        artifactCandidates: validated.value.artifactCheckpointCandidates,
        codeCandidates: validated.value.codeCheckpointCandidates,
      });
      if (!refValidation.ok) {
        return buildFailureExecutionResult(
          `Script declared an invalid checkpoint candidate path: ${refValidation.reason}`,
        );
      }

      return validated.value;
    } catch (error) {
      if (error instanceof ProviderLifecycleError) {
        throw error;
      }
      throw this.wrapDaytonaError(error, 'failed', 'Daytona script execution failed');
    }
  }

  async rehydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    const sandbox = await this.getExistingSandbox(args.environmentId);
    await this.ensureSandboxUsable(sandbox);
    return this.hydrateEnvironment(args);
  }

  async rebuildEnvironment(args: {
    processId: string;
    previousEnvironmentId: string | null;
    providerKind: ProviderKind;
    plan: HydrationPlan;
  }): Promise<HydrationResult & EnsuredEnvironment> {
    if (args.previousEnvironmentId !== null) {
      await this.teardownEnvironment({ environmentId: args.previousEnvironmentId }).catch(
        () => undefined,
      );
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
    try {
      const sandbox = await this.client.get(args.environmentId);
      await sandbox.delete(this.sandboxTimeoutSec);
    } catch (error) {
      if (error instanceof DaytonaNotFoundError) {
        return;
      }
      throw this.wrapDaytonaError(error, 'unavailable', 'Daytona sandbox teardown failed');
    }
  }

  async resolveCandidateContents(args: ResolveCandidateContentsArgs): Promise<string> {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(args.ref)) {
      return args.ref;
    }

    const sandbox = await this.getExistingSandbox(args.environmentId);
    const remotePath = resolveRemoteRefPath(args.ref);

    try {
      return (await sandbox.fs.downloadFile(remotePath, this.sandboxTimeoutSec)).toString('utf8');
    } catch (error) {
      throw this.wrapDaytonaError(
        error,
        'failed',
        `Checkpoint candidate '${args.ref}' could not be read from the Daytona sandbox`,
      );
    }
  }

  private async getExistingSandbox(environmentId: string): Promise<DaytonaSandboxLike> {
    try {
      return await this.client.get(environmentId);
    } catch (error) {
      if (isDaytonaNotFound(error)) {
        throw new ProviderLifecycleError(
          'lost',
          `Daytona sandbox '${environmentId}' could not be found.`,
        );
      }
      throw this.wrapDaytonaError(error, 'unavailable', 'Daytona sandbox lookup failed');
    }
  }

  private async ensureSandboxUsable(sandbox: DaytonaSandboxLike): Promise<void> {
    try {
      if (sandbox.state === 'started' || sandbox.state === 'starting') {
        return;
      }

      if (sandbox.recoverable === true) {
        await sandbox.recover(this.sandboxTimeoutSec);
        return;
      }

      await sandbox.start(this.sandboxTimeoutSec);
    } catch (error) {
      throw this.wrapDaytonaError(error, 'unavailable', 'Daytona sandbox could not be started');
    }
  }

  private async resolveWorkspaceRoot(sandbox: DaytonaSandboxLike): Promise<string> {
    const userHome = await sandbox.getUserHomeDir();
    return userHome === undefined || userHome.length === 0
      ? `/${DAYTONA_WORKSPACE_ROOT}`
      : `${userHome}/${DAYTONA_WORKSPACE_ROOT}`;
  }

  private async prepareWorkspaceLayout(sandbox: DaytonaSandboxLike): Promise<string> {
    await this.ensureSandboxUsable(sandbox);

    const workspaceRoot = await this.resolveWorkspaceRoot(sandbox);
    await sandbox.fs.createFolder(DAYTONA_WORKSPACE_ROOT, '755').catch(() => undefined);
    await sandbox.fs.createFolder(DAYTONA_ARTIFACTS_SUBDIR, '755');
    await sandbox.fs.createFolder(DAYTONA_SOURCES_SUBDIR, '755');
    return workspaceRoot;
  }

  private wrapDaytonaError(
    error: unknown,
    fallbackState: 'failed' | 'unavailable' | 'lost',
    messagePrefix: string,
  ): ProviderLifecycleError {
    if (error instanceof ProviderLifecycleError) {
      return error;
    }

    if (isDaytonaUnavailable(error)) {
      return new ProviderLifecycleError('unavailable', `${messagePrefix}: ${error.message}`);
    }

    if (isDaytonaNotFound(error)) {
      return new ProviderLifecycleError('lost', `${messagePrefix}: ${error.message}`);
    }

    if (error instanceof DaytonaError) {
      return new ProviderLifecycleError(fallbackState, `${messagePrefix}: ${error.message}`);
    }

    return new ProviderLifecycleError(
      fallbackState,
      `${messagePrefix}: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

function isNamedDaytonaError(error: unknown, name: string): error is Error {
  return error instanceof Error && error.name === name;
}

function isDaytonaNotFound(error: unknown): error is Error {
  return (
    error instanceof DaytonaNotFoundError || isNamedDaytonaError(error, 'DaytonaNotFoundError')
  );
}

function isDaytonaUnavailable(error: unknown): error is Error {
  return (
    error instanceof DaytonaAuthenticationError ||
    error instanceof DaytonaAuthorizationError ||
    error instanceof DaytonaConnectionError ||
    error instanceof DaytonaTimeoutError ||
    isNamedDaytonaError(error, 'DaytonaAuthenticationError') ||
    isNamedDaytonaError(error, 'DaytonaAuthorizationError') ||
    isNamedDaytonaError(error, 'DaytonaConnectionError') ||
    isNamedDaytonaError(error, 'DaytonaTimeoutError')
  );
}

function resolveCloneAuth(
  repositoryUrl: string,
  gitHubToken: string | null,
): { username: string; password: string } | null {
  if (gitHubToken === null || gitHubToken.length === 0) {
    return null;
  }

  return /^https?:\/\/github\.com\//.test(repositoryUrl)
    ? { username: 'git', password: gitHubToken }
    : null;
}

function safeFilenameForArtifact(displayName: string, artifactId: string): string {
  return `${sanitizeFilename(displayName)}-${sanitizeFilename(artifactId)}.md`;
}

function safeFilenameForSource(displayName: string, sourceAttachmentId: string): string {
  return `${sanitizeFilename(displayName)}-${sanitizeFilename(sourceAttachmentId)}`;
}

function sanitizeFilename(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized.length === 0 ? 'item' : sanitized;
}

function resolveRemoteRefPath(ref: string): string {
  if (ref.startsWith('/')) {
    return ref;
  }
  return ref.startsWith(`${DAYTONA_WORKSPACE_ROOT}/`) ? ref : `${DAYTONA_WORKSPACE_ROOT}/${ref}`;
}

function buildFailureExecutionResult(reason: string): ExecutionResult {
  return {
    processStatus: 'failed',
    processHistoryItems: [
      {
        historyItemId: `daytona-provider:${Date.now()}`,
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
    return { ok: false, reason: 'result must be a JSON object.' };
  }

  const obj = value as Record<string, unknown>;
  const validStatuses = ['running', 'waiting', 'completed', 'failed', 'interrupted'];
  if (!validStatuses.includes(String(obj.processStatus))) {
    return { ok: false, reason: 'processStatus must be one of the supported lifecycle values.' };
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
      return { ok: false, reason: `${key} must be an array.` };
    }
  }

  for (const candidate of obj.codeCheckpointCandidates as Array<Record<string, unknown>>) {
    if (
      typeof candidate.sourceAttachmentId !== 'string' ||
      candidate.sourceAttachmentId.length === 0
    ) {
      return {
        ok: false,
        reason: 'codeCheckpointCandidate is missing required sourceAttachmentId.',
      };
    }
    if (typeof candidate.workspaceRef !== 'string' || candidate.workspaceRef.length === 0) {
      return {
        ok: false,
        reason: `codeCheckpointCandidate '${candidate.sourceAttachmentId}' is missing required workspaceRef.`,
      };
    }
    if (typeof candidate.filePath !== 'string' || candidate.filePath.length === 0) {
      return {
        ok: false,
        reason: `codeCheckpointCandidate '${candidate.sourceAttachmentId}' is missing required filePath.`,
      };
    }
    if (typeof candidate.commitMessage !== 'string' || candidate.commitMessage.length === 0) {
      return {
        ok: false,
        reason: `codeCheckpointCandidate '${candidate.sourceAttachmentId}' is missing required commitMessage.`,
      };
    }
  }

  return {
    ok: true,
    value: {
      processStatus: obj.processStatus as ExecutionResult['processStatus'],
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

async function validateRemoteCandidateRefs(args: {
  sandbox: DaytonaSandboxLike;
  artifactCandidates: ExecutionResult['artifactCheckpointCandidates'];
  codeCandidates: ExecutionResult['codeCheckpointCandidates'];
}): Promise<ValidationResult<true>> {
  for (const candidate of args.artifactCandidates) {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate.contentsRef)) {
      continue;
    }
    try {
      await args.sandbox.fs.getFileDetails(resolveRemoteRefPath(candidate.contentsRef));
    } catch (error) {
      return {
        ok: false,
        reason: `artifactCheckpointCandidate '${candidate.artifactId}' points to an unreadable path: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      };
    }
  }

  for (const candidate of args.codeCandidates) {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate.workspaceRef)) {
      continue;
    }
    try {
      await args.sandbox.fs.getFileDetails(resolveRemoteRefPath(candidate.workspaceRef));
    } catch (error) {
      return {
        ok: false,
        reason: `codeCheckpointCandidate '${candidate.sourceAttachmentId}' points to an unreadable path: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      };
    }
  }

  return { ok: true, value: true };
}

import type {
  RefreshSourceAttachmentResponse,
  SourceAttachmentSummary,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore, UpdateSourceAttachmentRecord } from '../projects/platform-store.js';
import { planHydrationWorkingSet } from '../processes/environment/hydration-planner.js';
import type { ProviderAdapterRegistry } from '../processes/environment/provider-adapter-registry.js';
import type { HydrationPlan } from '../processes/environment/provider-adapter.js';
import { ProviderLifecycleError } from '../processes/environment/provider-adapter.js';
import type {
  GitHubRepositoryResolution,
  GitHubRepositoryResolver,
} from './github-repository-resolver.js';

type SourceRefreshPlatformStore = PlatformStore & {
  getProjectSourceAttachment: NonNullable<PlatformStore['getProjectSourceAttachment']>;
  updateSourceAttachment: NonNullable<PlatformStore['updateSourceAttachment']>;
};

type ResolvedRepository = Extract<GitHubRepositoryResolution, { kind: 'resolved' }>;

export type SourceHydrationExecutorResult =
  | {
      kind: 'settled';
      hydratedAt?: string;
    }
  | {
      kind: 'pending';
      refreshRequestedAt?: string;
    }
  | {
      kind: 'failed';
      failedAt?: string;
    }
  | {
      kind: 'not_available';
      message: string;
    };

export interface SourceHydrationExecutor {
  refreshRecoverableSource(args: {
    actor: AuthenticatedActor;
    projectId: string;
    sourceAttachment: SourceAttachmentSummary;
    repository: ResolvedRepository;
  }): Promise<SourceHydrationExecutorResult>;
}

export interface SourceRefreshService {
  synchronizeProjectSourceAttachments(args: {
    projectId: string;
    sourceAttachments: SourceAttachmentSummary[];
  }): Promise<SourceAttachmentSummary[]>;
  refreshSource(args: {
    actor: AuthenticatedActor;
    projectId: string;
    sourceAttachmentId: string;
  }): Promise<RefreshSourceAttachmentResponse>;
}

type RuntimeSourceHydrationPlatformStore = Pick<
  PlatformStore,
  | 'getCurrentProcessMaterialRefs'
  | 'getProcessEnvironmentProviderKind'
  | 'getProcessEnvironmentSummary'
  | 'getProcessWorkingSetFingerprint'
  | 'listProcessOutputs'
  | 'listProjectArtifacts'
  | 'listProjectProcesses'
  | 'listProjectSourceAttachments'
  | 'setProcessHydrationPlan'
  | 'upsertProcessEnvironmentState'
>;

export class RuntimeSourceHydrationExecutor implements SourceHydrationExecutor {
  constructor(
    private readonly platformStore: RuntimeSourceHydrationPlatformStore,
    private readonly providerAdapterRegistry: ProviderAdapterRegistry,
    private readonly defaultEnvironmentProviderKind: 'daytona' | 'local' = 'daytona',
  ) {}

  async refreshRecoverableSource(args: {
    actor: AuthenticatedActor;
    projectId: string;
    sourceAttachment: SourceAttachmentSummary;
    repository: ResolvedRepository;
  }): Promise<SourceHydrationExecutorResult> {
    void args.actor;

    const targetProcessId = await this.resolveTargetProcessId(args);

    if (targetProcessId === null) {
      return {
        kind: 'not_available',
        message:
          'Refresh is not available because no single current process working copy owns this source attachment.',
      };
    }

    const [currentMaterialRefs, currentOutputs, providerKind, existingEnvironment] =
      await Promise.all([
        this.platformStore.getCurrentProcessMaterialRefs({
          processId: targetProcessId,
        }),
        this.platformStore.listProcessOutputs({
          processId: targetProcessId,
        }),
        this.getProviderKind(targetProcessId),
        this.platformStore.getProcessEnvironmentSummary({
          processId: targetProcessId,
        }),
      ]);

    if (
      !currentMaterialRefs.sourceAttachmentIds.includes(args.sourceAttachment.sourceAttachmentId)
    ) {
      return {
        kind: 'not_available',
        message:
          'Refresh is not available because the source attachment is not in the target process working set.',
      };
    }

    if (existingEnvironment.state === 'running') {
      return {
        kind: 'not_available',
        message: 'Refresh is unavailable while the environment is actively running.',
      };
    }

    if (
      existingEnvironment.state === 'preparing' ||
      existingEnvironment.state === 'rehydrating' ||
      existingEnvironment.state === 'rebuilding' ||
      existingEnvironment.state === 'checkpointing'
    ) {
      return {
        kind: 'pending',
        refreshRequestedAt: new Date().toISOString(),
      };
    }

    const plan = planHydrationWorkingSet({
      ...currentMaterialRefs,
      outputIds: currentOutputs.map((output) => output.outputId),
    });
    await this.platformStore.setProcessHydrationPlan({
      processId: targetProcessId,
      providerKind,
      plan,
    });

    const hydrationPlan = await this.buildAdapterHydrationPlan({
      projectId: args.projectId,
      processId: targetProcessId,
      plan,
    });
    const adapter = this.providerAdapterRegistry.resolve(providerKind);

    try {
      const hydrationResult =
        existingEnvironment.environmentId === null ||
        existingEnvironment.state === 'absent' ||
        existingEnvironment.state === 'lost' ||
        existingEnvironment.state === 'failed' ||
        existingEnvironment.state === 'unavailable'
          ? await this.runHydrate(adapter, {
              processId: targetProcessId,
              providerKind,
              plan: hydrationPlan,
            })
          : await this.runRehydrate(adapter, {
              environmentId: existingEnvironment.environmentId,
              processId: targetProcessId,
              providerKind,
              plan: hydrationPlan,
            });

      await this.platformStore.upsertProcessEnvironmentState({
        processId: targetProcessId,
        providerKind,
        state: 'ready',
        environmentId: hydrationResult.environmentId,
        blockedReason: null,
        lastHydratedAt: hydrationResult.hydratedAt,
      });

      return {
        kind: 'settled',
        hydratedAt: hydrationResult.hydratedAt,
      };
    } catch (error) {
      const failureState =
        error instanceof ProviderLifecycleError ? error.environmentState : 'failed';
      const failureReason = error instanceof Error ? error.message : 'Unknown refresh error.';

      await this.platformStore.upsertProcessEnvironmentState({
        processId: targetProcessId,
        providerKind,
        state: failureState,
        environmentId: existingEnvironment.environmentId,
        blockedReason: failureReason,
        lastHydratedAt: existingEnvironment.lastHydratedAt,
      });

      return {
        kind: 'failed',
        failedAt: new Date().toISOString(),
      };
    }
  }

  private async resolveTargetProcessId(args: {
    projectId: string;
    sourceAttachment: SourceAttachmentSummary;
  }): Promise<string | null> {
    if (args.sourceAttachment.processId !== null) {
      return args.sourceAttachment.processId;
    }

    const processes = await this.platformStore.listProjectProcesses({
      projectId: args.projectId,
    });
    const candidateProcessIds = (
      await Promise.all(
        processes.map(async (process) => {
          const materialRefs = await this.platformStore.getCurrentProcessMaterialRefs({
            processId: process.processId,
          });

          return materialRefs.sourceAttachmentIds.includes(args.sourceAttachment.sourceAttachmentId)
            ? process.processId
            : null;
        }),
      )
    ).filter((processId): processId is string => processId !== null);

    return candidateProcessIds.length === 1 ? (candidateProcessIds.at(0) ?? null) : null;
  }

  private async getProviderKind(processId: string): Promise<'daytona' | 'local'> {
    return (
      (await this.platformStore.getProcessEnvironmentProviderKind({
        processId,
      })) ?? this.defaultEnvironmentProviderKind
    );
  }

  private async buildAdapterHydrationPlan(args: {
    projectId: string;
    processId: string;
    plan: {
      artifactIds: string[];
      sourceAttachmentIds: string[];
      outputIds: string[];
    };
  }): Promise<HydrationPlan> {
    const [artifacts, sources, outputs, fingerprint] = await Promise.all([
      this.platformStore.listProjectArtifacts({
        projectId: args.projectId,
      }),
      this.platformStore.listProjectSourceAttachments({
        projectId: args.projectId,
      }),
      this.platformStore.listProcessOutputs({
        processId: args.processId,
      }),
      this.platformStore.getProcessWorkingSetFingerprint({
        processId: args.processId,
      }),
    ]);

    if (fingerprint === null) {
      throw new Error(
        `HydrationPlan is missing a persisted workingSetFingerprint for process '${args.processId}'.`,
      );
    }

    const artifactById = new Map(artifacts.map((artifact) => [artifact.artifactId, artifact]));
    const sourceById = new Map(sources.map((source) => [source.sourceAttachmentId, source]));
    const outputById = new Map(outputs.map((output) => [output.outputId, output]));

    return {
      fingerprint,
      artifactInputs: args.plan.artifactIds.map((artifactId) => {
        const artifact = artifactById.get(artifactId);
        return {
          artifactId,
          displayName: artifact?.displayName ?? artifactId,
          versionLabel: artifact?.currentVersionLabel ?? null,
        };
      }),
      outputInputs: args.plan.outputIds.map((outputId) => {
        const output = outputById.get(outputId);
        return {
          outputId,
          displayName: output?.displayName ?? outputId,
          revisionLabel: output?.revisionLabel ?? null,
        };
      }),
      sourceInputs: args.plan.sourceAttachmentIds.map((sourceAttachmentId) => {
        const source = sourceById.get(sourceAttachmentId);

        if (source === undefined) {
          throw new Error(
            `HydrationPlan references sourceAttachmentId '${sourceAttachmentId}' that is not in the project's source listing.`,
          );
        }

        return {
          sourceAttachmentId,
          displayName: source.displayName,
          repositoryUrl: source.repositoryUrl,
          targetRef: source.targetRef,
          accessMode: source.accessMode,
        };
      }),
    };
  }

  private async runHydrate(
    adapter: ReturnType<ProviderAdapterRegistry['resolve']>,
    args: {
      processId: string;
      providerKind: 'daytona' | 'local';
      plan: HydrationPlan;
    },
  ) {
    const ensuredEnvironment = await adapter.ensureEnvironment({
      processId: args.processId,
      providerKind: args.providerKind,
    });

    const hydration = await adapter.hydrateEnvironment({
      environmentId: ensuredEnvironment.environmentId,
      plan: args.plan,
    });

    return {
      environmentId: hydration.environmentId,
      hydratedAt: hydration.hydratedAt,
    };
  }

  private async runRehydrate(
    adapter: ReturnType<ProviderAdapterRegistry['resolve']>,
    args: {
      environmentId: string;
      processId: string;
      providerKind: 'daytona' | 'local';
      plan: HydrationPlan;
    },
  ) {
    void args.processId;
    void args.providerKind;
    const hydration = await adapter.rehydrateEnvironment({
      environmentId: args.environmentId,
      plan: args.plan,
    });

    return {
      environmentId: hydration.environmentId,
      hydratedAt: hydration.hydratedAt,
    };
  }
}

export class DefaultSourceRefreshService implements SourceRefreshService {
  constructor(
    private readonly platformStore: SourceRefreshPlatformStore,
    private readonly gitHubRepositoryResolver: GitHubRepositoryResolver,
    private readonly hydrationExecutor: SourceHydrationExecutor,
  ) {}

  async synchronizeProjectSourceAttachments(args: {
    projectId: string;
    sourceAttachments: SourceAttachmentSummary[];
  }): Promise<SourceAttachmentSummary[]> {
    return Promise.all(
      args.sourceAttachments.map(async (sourceAttachment) => {
        const evaluation = await this.evaluateSourceAttachment(args.projectId, sourceAttachment);
        return evaluation.sourceAttachment;
      }),
    );
  }

  async refreshSource(args: {
    actor: AuthenticatedActor;
    projectId: string;
    sourceAttachmentId: string;
  }): Promise<RefreshSourceAttachmentResponse> {
    const existingSourceAttachment = await this.platformStore.getProjectSourceAttachment({
      projectId: args.projectId,
      sourceAttachmentId: args.sourceAttachmentId,
    });

    if (existingSourceAttachment === null || existingSourceAttachment.detachedAt != null) {
      throw new AppError({
        code: 'SOURCE_ATTACHMENT_NOT_FOUND',
        message: 'The requested source attachment was not found in this project.',
        statusCode: 404,
      });
    }

    const evaluation = await this.evaluateSourceAttachment(
      args.projectId,
      existingSourceAttachment,
    );
    const sourceAttachment = evaluation.sourceAttachment;

    if (
      sourceAttachment.refreshStatus === 'pending' &&
      sourceAttachment.refreshRequestedAt !== null
    ) {
      return {
        refreshStatus: 'pending',
        refreshRequestedAt: sourceAttachment.refreshRequestedAt,
      };
    }

    if (
      sourceAttachment.hydrationState !== 'stale' &&
      sourceAttachment.hydrationState !== 'not_hydrated'
    ) {
      throw new AppError({
        code: 'SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE',
        message: 'Refresh is only available for stale or not-yet-hydrated source attachments.',
        statusCode: 409,
      });
    }

    if (evaluation.repository === null) {
      throw new AppError({
        code: 'SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE',
        message: 'Refresh is not available because the source cannot be resolved safely right now.',
        statusCode: 409,
      });
    }

    const refreshResult = await this.hydrationExecutor.refreshRecoverableSource({
      actor: args.actor,
      projectId: args.projectId,
      sourceAttachment,
      repository: evaluation.repository,
    });

    switch (refreshResult.kind) {
      case 'not_available': {
        throw new AppError({
          code: 'SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE',
          message: refreshResult.message,
          statusCode: 409,
        });
      }
      case 'pending': {
        const refreshRequestedAt = refreshResult.refreshRequestedAt ?? new Date().toISOString();
        const updatedSourceAttachment = await this.persistSourceAttachment(
          args.projectId,
          sourceAttachment,
          {
            refreshStatus: 'pending',
            refreshRequestedAt,
          },
        );

        return {
          refreshStatus: 'pending',
          refreshRequestedAt: updatedSourceAttachment.refreshRequestedAt ?? refreshRequestedAt,
        };
      }
      case 'failed': {
        const refreshRequestedAt = refreshResult.failedAt ?? new Date().toISOString();
        const updatedSourceAttachment = await this.persistSourceAttachment(
          args.projectId,
          sourceAttachment,
          {
            refreshStatus: 'failed',
            refreshRequestedAt,
          },
        );

        return {
          refreshStatus: 'failed',
          sourceAttachment: updatedSourceAttachment,
        };
      }
      case 'settled': {
        const hydratedAt = refreshResult.hydratedAt ?? new Date().toISOString();
        const updatedSourceAttachment = await this.persistSourceAttachment(
          args.projectId,
          sourceAttachment,
          {
            hydrationState: 'hydrated',
            lastHydratedAt: hydratedAt,
            lastHydratedResolvedRef: evaluation.repository.resolvedRef,
            lastObservedRemoteResolvedRef: evaluation.repository.resolvedRef,
            freshnessReason: null,
            refreshStatus: 'idle',
            refreshRequestedAt: null,
          },
        );

        return {
          refreshStatus: 'settled',
          sourceAttachment: updatedSourceAttachment,
        };
      }
    }
  }

  private async evaluateSourceAttachment(
    projectId: string,
    sourceAttachment: SourceAttachmentSummary,
  ): Promise<{
    sourceAttachment: SourceAttachmentSummary;
    repository: ResolvedRepository | null;
  }> {
    if (sourceAttachment.detachedAt != null) {
      return {
        sourceAttachment,
        repository: null,
      };
    }

    const repositoryResolution = await this.gitHubRepositoryResolver.resolveRepository({
      repositoryUrl: sourceAttachment.repositoryUrl,
      targetRef: sourceAttachment.targetRef,
    });

    if (repositoryResolution.kind !== 'resolved') {
      const unavailableSourceAttachment =
        sourceAttachment.hydrationState === 'unavailable' &&
        sourceAttachment.lastObservedRemoteResolvedRef === null &&
        sourceAttachment.freshnessReason === deriveUnavailableFreshnessReason(sourceAttachment)
          ? sourceAttachment
          : await this.persistSourceAttachment(projectId, sourceAttachment, {
              hydrationState: 'unavailable',
              freshnessReason: deriveUnavailableFreshnessReason(sourceAttachment),
              lastObservedRemoteResolvedRef: null,
            });

      return {
        sourceAttachment: unavailableSourceAttachment,
        repository: null,
      };
    }

    const nextHydrationState = deriveHydrationState({
      sourceAttachment,
      repositoryResolution,
    });
    const nextFreshnessReason = deriveFreshnessReason({
      sourceAttachment,
      repositoryResolution,
      hydrationState: nextHydrationState,
    });

    const shouldPersist =
      sourceAttachment.hydrationState !== nextHydrationState ||
      sourceAttachment.freshnessReason !== nextFreshnessReason ||
      sourceAttachment.lastObservedRemoteResolvedRef !== repositoryResolution.resolvedRef;

    if (!shouldPersist) {
      return {
        sourceAttachment,
        repository: repositoryResolution,
      };
    }

    const updatedSourceAttachment = await this.persistSourceAttachment(
      projectId,
      sourceAttachment,
      {
        hydrationState: nextHydrationState,
        freshnessReason: nextFreshnessReason,
        lastObservedRemoteResolvedRef: repositoryResolution.resolvedRef,
      },
    );

    return {
      sourceAttachment: updatedSourceAttachment,
      repository: repositoryResolution,
    };
  }

  private async persistSourceAttachment(
    projectId: string,
    sourceAttachment: SourceAttachmentSummary,
    patch: Pick<
      UpdateSourceAttachmentRecord,
      | 'hydrationState'
      | 'freshnessReason'
      | 'lastHydratedAt'
      | 'lastHydratedResolvedRef'
      | 'lastObservedRemoteResolvedRef'
      | 'refreshStatus'
      | 'refreshRequestedAt'
    >,
  ): Promise<SourceAttachmentSummary> {
    return this.platformStore.updateSourceAttachment({
      projectId,
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      purpose: sourceAttachment.purpose,
      accessMode: sourceAttachment.accessMode,
      targetRef: sourceAttachment.targetRef,
      hydrationState: patch.hydrationState,
      freshnessReason: patch.freshnessReason,
      lastHydratedAt: patch.lastHydratedAt,
      lastHydratedResolvedRef: patch.lastHydratedResolvedRef,
      lastObservedRemoteResolvedRef: patch.lastObservedRemoteResolvedRef,
      refreshStatus: patch.refreshStatus,
      refreshRequestedAt: patch.refreshRequestedAt,
    });
  }
}

function deriveUnavailableFreshnessReason(sourceAttachment: SourceAttachmentSummary): string {
  return sourceAttachment.targetRef === null ? 'repository_unavailable' : 'target_ref_unavailable';
}

function deriveHydrationState(args: {
  sourceAttachment: SourceAttachmentSummary;
  repositoryResolution: ResolvedRepository;
}): SourceAttachmentSummary['hydrationState'] {
  if (isBranchHeadDrift(args)) {
    return 'stale';
  }

  if (
    args.sourceAttachment.hydrationState === 'stale' &&
    args.sourceAttachment.freshnessReason === 'branch_head_moved'
  ) {
    return 'hydrated';
  }

  if (args.sourceAttachment.hydrationState !== 'unavailable') {
    return args.sourceAttachment.hydrationState;
  }

  if (args.sourceAttachment.lastHydratedAt === null) {
    return 'not_hydrated';
  }

  if (
    args.sourceAttachment.freshnessReason === 'target_ref_changed' ||
    args.sourceAttachment.freshnessReason === 'working_copy_missing'
  ) {
    return 'stale';
  }

  return 'hydrated';
}

function deriveFreshnessReason(args: {
  sourceAttachment: SourceAttachmentSummary;
  repositoryResolution: ResolvedRepository;
  hydrationState: SourceAttachmentSummary['hydrationState'];
}): string | null {
  if (args.hydrationState === 'stale' && isBranchHeadDrift(args)) {
    return 'branch_head_moved';
  }

  if (
    args.sourceAttachment.hydrationState === 'stale' &&
    args.sourceAttachment.freshnessReason === 'branch_head_moved' &&
    args.hydrationState === 'hydrated'
  ) {
    return null;
  }

  if (args.hydrationState === 'unavailable') {
    return deriveUnavailableFreshnessReason(args.sourceAttachment);
  }

  if (
    args.sourceAttachment.hydrationState === 'unavailable' &&
    args.sourceAttachment.lastHydratedAt === null
  ) {
    return null;
  }

  return args.sourceAttachment.freshnessReason;
}

function isBranchHeadDrift(args: {
  sourceAttachment: SourceAttachmentSummary;
  repositoryResolution: ResolvedRepository;
}): boolean {
  return (
    args.repositoryResolution.targetRefKind === 'branch' &&
    args.sourceAttachment.lastHydratedResolvedRef !== null &&
    args.repositoryResolution.resolvedRef !== null &&
    args.repositoryResolution.resolvedRef !== args.sourceAttachment.lastHydratedResolvedRef
  );
}

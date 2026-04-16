import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type {
  CurrentProcessRequest,
  EnvironmentSummary,
  LastCheckpointResult,
  ProcessHistoryItem,
  ProcessMaterialsSectionEnvelope,
  ProcessSummary,
  RebuildProcessResponse,
  RehydrateProcessResponse,
  SideWorkSectionEnvelope,
  SourceAttachmentSummary,
} from '../../../../shared/contracts/index.js';
import {
  rebuildProcessResponseSchema,
  rehydrateProcessResponseSchema,
} from '../../../../shared/contracts/index.js';
import { AppError } from '../../../errors/app-error.js';
import {
  processEnvironmentNotRecoverableErrorCode,
  processEnvironmentPrerequisiteMissingErrorCode,
  processEnvironmentUnavailableErrorCode,
} from '../../../errors/codes.js';
import type { AuthenticatedActor } from '../../auth/auth-session.service.js';
import type { PlatformStore, WorkingSetPlan } from '../../projects/platform-store.js';
import type { ProcessLiveHub } from '../live/process-live-hub.js';
import type { ProcessAccessService } from '../process-access.service.js';
import { buildProcessSurfaceSummary } from '../process-work-surface.service.js';
import { MaterialsSectionReader } from '../readers/materials-section.reader.js';
import { SideWorkSectionReader } from '../readers/side-work-section.reader.js';
import type { CheckpointPlanner } from './checkpoint-planner.js';
import type { CheckpointArtifact, CodeCheckpointTarget, CodeDiff } from './checkpoint-types.js';
import type { CodeCheckpointWriter } from './code-checkpoint-writer.js';
import { planHydrationWorkingSet } from './hydration-planner.js';
import type { ProviderAdapterRegistry } from './provider-adapter-registry.js';
import type {
  ArtifactCheckpointCandidate,
  CodeCheckpointCandidate,
  ExecutionResult,
  HydrationPlan,
  ProviderAdapter,
} from './provider-adapter.js';
import type { ScriptExecutionService } from './script-execution.service.js';

export class ProcessEnvironmentService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
    private readonly providerAdapterRegistry: ProviderAdapterRegistry,
    private readonly processLiveHub: ProcessLiveHub,
    private readonly scriptExecutionService?: ScriptExecutionService,
    private readonly checkpointPlanner?: CheckpointPlanner,
    private readonly codeCheckpointWriter?: CodeCheckpointWriter,
    private readonly defaultEnvironmentProviderKind: 'daytona' | 'local' = 'local',
    private readonly artifactCheckpointPersistence: Pick<
      PlatformStore,
      'persistCheckpointArtifacts'
    > = platformStore,
  ) {}

  /**
   * Executes environment hydration work and publishes the outcome (`ready` or
   * `failed`) to live subscribers. On success, also transitions the process to
   * `running` and includes the updated process in the live publication.
   * Designed to be called fire-and-forget after the HTTP handler responds with
   * `preparing` — the caller must NOT await this method.
   *
   * Failures inside `executeHydration` (including secondary failures while
   * upserting the failed-state row) flow through `handleAsyncFailure` so the
   * environment never gets stranded in `preparing`.
   */
  runHydrationAsync(args: { projectId: string; processId: string }): void {
    void this.executeHydration(args).catch((error: unknown) => {
      this.handleAsyncFailure({
        projectId: args.projectId,
        processId: args.processId,
        environmentId: null,
        contextLabel: 'hydration',
        error,
      });
    });
  }

  private async getAuthoritativeProviderKind(processId: string): Promise<'daytona' | 'local'> {
    return (
      (await this.platformStore.getProcessEnvironmentProviderKind({
        processId,
      })) ?? this.defaultEnvironmentProviderKind
    );
  }

  private async upsertEnvironmentState(args: {
    processId: string;
    providerKind?: 'daytona' | 'local';
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: EnvironmentSummary['lastCheckpointResult'];
  }): Promise<EnvironmentSummary> {
    return this.platformStore.upsertProcessEnvironmentState({
      ...args,
      providerKind: args.providerKind ?? (await this.getAuthoritativeProviderKind(args.processId)),
    });
  }

  async rehydrate(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<RehydrateProcessResponse> {
    const access = await this.processAccessService.assertProcessAccess(args);
    const [existingEnvironment, providerKind] = await Promise.all([
      this.platformStore.getProcessEnvironmentSummary({
        processId: access.process.processId,
      }),
      this.getAuthoritativeProviderKind(access.process.processId),
    ]);

    this.assertRehydrateAvailable(existingEnvironment);

    const plan = await this.buildHydrationPlan(access.process.processId);
    await this.platformStore.setProcessHydrationPlan({
      processId: access.process.processId,
      plan,
    });

    const environment = await this.upsertEnvironmentState({
      processId: access.process.processId,
      providerKind,
      state: 'rehydrating',
      environmentId: existingEnvironment.environmentId,
      blockedReason: 'Rehydrate is in progress.',
      lastHydratedAt: existingEnvironment.lastHydratedAt,
    });

    this.publishEnvironmentUpsert({
      projectId: access.project.projectId,
      processId: access.process.processId,
      process: access.process,
      environment,
    });

    if (environment.environmentId !== null) {
      this.runRehydrateAsync({
        projectId: access.project.projectId,
        processId: access.process.processId,
        environmentId: environment.environmentId,
        plan,
      });
    }

    return rehydrateProcessResponseSchema.parse({
      accepted: true,
      process: buildProcessSurfaceSummary(access.process, environment),
      currentRequest: null,
      environment,
    });
  }

  async rebuild(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<RebuildProcessResponse> {
    const access = await this.processAccessService.assertProcessAccess(args);
    const [existingEnvironment, providerKind] = await Promise.all([
      this.platformStore.getProcessEnvironmentSummary({
        processId: access.process.processId,
      }),
      this.getAuthoritativeProviderKind(access.process.processId),
    ]);

    this.assertRebuildAvailable(existingEnvironment);

    const [plan, storeHasMaterials] = await Promise.all([
      this.buildHydrationPlan(access.process.processId),
      this.platformStore.hasCanonicalRecoveryMaterials({ processId: access.process.processId }),
    ]);
    if (!hasCanonicalRecoveryMaterials(plan) && !storeHasMaterials) {
      throw new AppError({
        code: processEnvironmentPrerequisiteMissingErrorCode,
        message: 'Required canonical materials are missing for rebuild.',
        statusCode: 422,
      });
    }

    await this.platformStore.setProcessHydrationPlan({
      processId: access.process.processId,
      plan,
    });

    const rebuildingEnvironmentId = buildRebuildingEnvironmentId(access.process.processId);
    const environment = await this.upsertEnvironmentState({
      processId: access.process.processId,
      providerKind,
      state: 'rebuilding',
      environmentId: rebuildingEnvironmentId,
      blockedReason: 'Rebuild is in progress.',
      lastHydratedAt: existingEnvironment.lastHydratedAt,
    });
    const rebuildHistoryItem = await this.appendProcessEvent({
      processId: access.process.processId,
      text: 'Environment rebuild started.',
    });

    this.publishEnvironmentUpsert({
      projectId: access.project.projectId,
      processId: access.process.processId,
      process: access.process,
      environment,
      historyItems: [rebuildHistoryItem],
    });

    this.runRebuildAsync({
      projectId: access.project.projectId,
      processId: access.process.processId,
      environmentId: rebuildingEnvironmentId,
      plan,
    });

    return rebuildProcessResponseSchema.parse({
      accepted: true,
      process: buildProcessSurfaceSummary(access.process, environment),
      currentRequest: null,
      environment,
    });
  }

  private runRehydrateAsync(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    plan: WorkingSetPlan;
  }): void {
    void this.executeRehydrate(args).catch((error: unknown) => {
      this.handleAsyncFailure({
        projectId: args.projectId,
        processId: args.processId,
        environmentId: args.environmentId,
        contextLabel: 'rehydrate',
        error,
      });
    });
  }

  private runRebuildAsync(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    plan: WorkingSetPlan;
  }): void {
    void this.executeRebuild(args).catch((error: unknown) => {
      this.handleAsyncFailure({
        projectId: args.projectId,
        processId: args.processId,
        environmentId: args.environmentId,
        contextLabel: 'rebuild',
        error,
      });
    });
  }

  private async executeHydration(args: { projectId: string; processId: string }): Promise<void> {
    const [plan, existing, currentProcess, providerKind] = await Promise.all([
      this.platformStore.getProcessHydrationPlan({ processId: args.processId }),
      this.platformStore.getProcessEnvironmentSummary({ processId: args.processId }),
      this.platformStore.getProcessRecord({ processId: args.processId }),
      this.getAuthoritativeProviderKind(args.processId),
    ]);

    const resolvedPlan = plan ?? { artifactIds: [], sourceAttachmentIds: [], outputIds: [] };
    const projectId = currentProcess?.projectId ?? args.projectId;
    const adapter = this.providerAdapterRegistry.resolve(providerKind);
    const hydrationPlan = await this.buildAdapterHydrationPlan({
      projectId,
      processId: args.processId,
      plan: resolvedPlan,
    });
    const preparationHistoryItem = await this.appendProcessEvent({
      processId: args.processId,
      text: 'Environment preparation started.',
    });
    this.publishHistoryUpsert({
      projectId: args.projectId,
      processId: args.processId,
      historyItems: [preparationHistoryItem],
    });

    let hydratedEnvironment: EnvironmentSummary | null = null;
    let hydrationError: string | null = null;

    try {
      const ensured = await adapter.ensureEnvironment({
        processId: args.processId,
        providerKind,
      });
      const result = await adapter.hydrateEnvironment({
        environmentId: ensured.environmentId,
        plan: hydrationPlan,
      });
      hydratedEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        providerKind,
        state: 'ready',
        environmentId: result.environmentId,
        blockedReason: null,
        lastHydratedAt: result.hydratedAt,
      });
    } catch (error) {
      hydrationError = error instanceof Error ? error.message : 'Unknown hydration error';
    }

    if (hydratedEnvironment !== null) {
      let transitionedProcess: ProcessSummary | null = null;
      try {
        const transitionResult = await this.platformStore.transitionProcessToRunning({
          processId: args.processId,
        });
        transitionedProcess = transitionResult.process;
      } catch (error) {
        await this.transitionToFailed({
          projectId: args.projectId,
          processId: args.processId,
          environmentId: hydratedEnvironment.environmentId,
          previousLastHydratedAt: hydratedEnvironment.lastHydratedAt,
          failureReason:
            error instanceof Error
              ? error.message
              : 'Unknown error while transitioning process to running.',
        });
        return;
      }

      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: transitionedProcess,
        environment: hydratedEnvironment,
      });

      this.runExecutionAsync({
        projectId: args.projectId,
        processId: args.processId,
        environmentId: hydratedEnvironment.environmentId,
      });
    } else {
      await this.transitionToFailed({
        projectId: args.projectId,
        processId: args.processId,
        environmentId: existing.environmentId,
        previousLastHydratedAt: existing.lastHydratedAt,
        failureReason: hydrationError,
      });
    }
  }

  private async executeRehydrate(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    plan: WorkingSetPlan;
  }): Promise<void> {
    const [providerKind, currentProcess] = await Promise.all([
      this.getAuthoritativeProviderKind(args.processId),
      this.platformStore.getProcessRecord({
        processId: args.processId,
      }),
    ]);
    const projectId = currentProcess?.projectId ?? args.projectId;
    const adapter = this.providerAdapterRegistry.resolve(providerKind);
    const hydrationPlan = await this.buildAdapterHydrationPlan({
      projectId,
      processId: args.processId,
      plan: args.plan,
    });

    try {
      const result = await adapter.rehydrateEnvironment({
        environmentId: args.environmentId,
        plan: hydrationPlan,
      });
      const readyEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        providerKind,
        state: 'ready',
        environmentId: result.environmentId,
        blockedReason: null,
        lastHydratedAt: result.hydratedAt,
      });
      await this.publishRecoveryOutcome({
        projectId: args.projectId,
        processId: args.processId,
        environment: readyEnvironment,
      });
    } catch (error) {
      await this.publishRecoveryFailure({
        projectId: args.projectId,
        processId: args.processId,
        environmentId: args.environmentId,
        failureReason: error instanceof Error ? error.message : 'Unknown rehydrate error',
      });
    }
  }

  private async executeRebuild(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    plan: WorkingSetPlan;
  }): Promise<void> {
    const [providerKind, currentProcess] = await Promise.all([
      this.getAuthoritativeProviderKind(args.processId),
      this.platformStore.getProcessRecord({
        processId: args.processId,
      }),
    ]);
    const projectId = currentProcess?.projectId ?? args.projectId;
    const adapter = this.providerAdapterRegistry.resolve(providerKind);
    const hydrationPlan = await this.buildAdapterHydrationPlan({
      projectId,
      processId: args.processId,
      plan: args.plan,
    });

    try {
      const result = await adapter.rebuildEnvironment({
        processId: args.processId,
        providerKind,
        plan: hydrationPlan,
      });
      const readyEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        providerKind,
        state: 'ready',
        environmentId: result.environmentId,
        blockedReason: null,
        lastHydratedAt: result.hydratedAt,
      });
      await this.publishRecoveryOutcome({
        projectId: args.projectId,
        processId: args.processId,
        environment: readyEnvironment,
      });
    } catch (error) {
      await this.publishRecoveryFailure({
        projectId: args.projectId,
        processId: args.processId,
        environmentId: args.environmentId,
        failureReason: error instanceof Error ? error.message : 'Unknown rebuild error',
      });
    }
  }

  private runExecutionAsync(args: {
    projectId: string;
    processId: string;
    environmentId: string | null;
  }): void {
    const scriptExecutionService = this.scriptExecutionService;

    if (scriptExecutionService === undefined || args.environmentId === null) {
      return;
    }

    const environmentId = args.environmentId;

    setTimeout(() => {
      // Deferred one tick so Story 2 bootstrap reads observe durable `ready` before execution advances the env state.
      void this.executeExecution({
        ...args,
        environmentId,
        scriptExecutionService,
      }).catch((error: unknown) => {
        this.handleAsyncFailure({
          projectId: args.projectId,
          processId: args.processId,
          environmentId,
          contextLabel: 'execution',
          error,
        });
      });
    }, 0);
  }

  private async executeExecution(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    scriptExecutionService: ScriptExecutionService;
  }): Promise<void> {
    const [currentProcess, providerKind] = await Promise.all([
      this.platformStore.getProcessRecord({
        processId: args.processId,
      }),
      this.getAuthoritativeProviderKind(args.processId),
    ]);

    if (currentProcess === null) {
      return;
    }

    let lastHydratedAt: string | null = null;

    try {
      const existingEnvironment = await this.platformStore.getProcessEnvironmentSummary({
        processId: args.processId,
      });
      lastHydratedAt = existingEnvironment.lastHydratedAt;
      const runningEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        providerKind,
        state: 'running',
        environmentId: args.environmentId,
        blockedReason: null,
        lastHydratedAt,
      });
      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: currentProcess,
        environment: runningEnvironment,
      });

      const executionResult = await args.scriptExecutionService.executeFor({
        providerKind,
        environmentId: args.environmentId,
      });

      // Apply ExecutionResult side effects (history items, output writes, side-work writes)
      // before deciding the next env state. These produce durable process-facing updates
      // even when the run failed, so the process surface reflects what happened.
      const sideEffects = await this.applyExecutionResultSideEffects({
        processId: args.processId,
        executionResult,
      });
      const [materials, sideWork] = await Promise.all([
        this.readMaterials({
          projectId: currentProcess.projectId,
          processId: args.processId,
        }),
        this.readSideWork({
          processId: args.processId,
        }),
      ]);

      if (executionResult.processStatus === 'failed') {
        const failureReason = extractExecutionFailureReason(executionResult);
        const lifecycleResult = await this.platformStore.transitionProcessToFailed({
          processId: args.processId,
        });
        const failedEnvironment = await this.upsertEnvironmentState({
          processId: args.processId,
          providerKind,
          state: 'failed',
          environmentId: args.environmentId,
          blockedReason: failureReason,
          lastHydratedAt: runningEnvironment.lastHydratedAt,
        });
        const executionFailedHistoryItem = await this.appendProcessEvent({
          processId: args.processId,
          text: 'Execution failed.',
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: lifecycleResult.process,
          environment: failedEnvironment,
          historyItems: [...sideEffects.historyItems, executionFailedHistoryItem],
          currentRequest: lifecycleResult.currentRequest,
          materials,
          sideWork,
        });
        return;
      }

      const lifecycleResult = await this.transitionProcessForExecutionStatus({
        processId: args.processId,
        processStatus: executionResult.processStatus,
      });
      const checkpointingEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        providerKind,
        state: 'checkpointing',
        environmentId: args.environmentId,
        blockedReason: null,
        lastHydratedAt: runningEnvironment.lastHydratedAt,
      });
      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: lifecycleResult.process,
        environment: checkpointingEnvironment,
        historyItems: sideEffects.historyItems,
        currentRequest: lifecycleResult.currentRequest,
        materials,
        sideWork,
      });

      if (
        this.checkpointPlanner !== undefined ||
        this.codeCheckpointWriter !== undefined ||
        this.artifactCheckpointPersistence !== this.platformStore
      ) {
        this.runCheckpointAsync({
          projectId: args.projectId,
          processId: args.processId,
          environmentId: args.environmentId,
          executionResult,
        });
      }
    } catch (error) {
      try {
        const failedEnvironment = await this.upsertEnvironmentState({
          processId: args.processId,
          providerKind,
          state: 'failed',
          environmentId: args.environmentId,
          blockedReason: error instanceof Error ? error.message : 'Unknown execution error',
          lastHydratedAt,
        });
        const executionFailedHistoryItem = await this.appendProcessEvent({
          processId: args.processId,
          text: 'Execution failed.',
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: failedEnvironment,
          historyItems: [executionFailedHistoryItem],
        });
      } catch (secondaryError) {
        // Even when the failed-state upsert itself fails (e.g., DB unavailable),
        // we must not let the rejection escape the fire-and-forget path.
        // Structured-log the secondary failure so operators can observe it.
        // eslint-disable-next-line no-console
        console.error('[process-environment] secondary failure during executeExecution catch', {
          processId: args.processId,
          environmentId: args.environmentId,
          primaryError: error instanceof Error ? error.message : String(error),
          secondaryError:
            secondaryError instanceof Error ? secondaryError.message : String(secondaryError),
        });
      }
    }
  }

  private async applyExecutionResultSideEffects(args: {
    processId: string;
    executionResult: ExecutionResult;
  }): Promise<{ historyItems: ProcessHistoryItem[] }> {
    const historyItems: ProcessHistoryItem[] = [];

    for (const historyItem of args.executionResult.processHistoryItems) {
      historyItems.push(
        await this.platformStore.appendProcessHistoryItem({
          processId: args.processId,
          kind: historyItem.kind,
          lifecycleState: historyItem.lifecycleState,
          text: historyItem.text,
          relatedSideWorkId: historyItem.relatedSideWorkId,
          relatedArtifactId: historyItem.relatedArtifactId,
          clientRequestId: null,
        }),
      );
    }

    await this.platformStore.replaceCurrentProcessOutputs({
      processId: args.processId,
      outputs: args.executionResult.outputWrites,
    });

    await this.platformStore.replaceCurrentProcessSideWorkItems({
      processId: args.processId,
      items: args.executionResult.sideWorkWrites,
    });

    return { historyItems };
  }

  private runCheckpointAsync(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    executionResult: ExecutionResult;
  }): void {
    const checkpointPlanner = this.checkpointPlanner;
    const codeCheckpointWriter = this.codeCheckpointWriter;

    if (checkpointPlanner === undefined || codeCheckpointWriter === undefined) {
      return;
    }

    setTimeout(() => {
      void this.executeCheckpoint({
        ...args,
        checkpointPlanner,
        codeCheckpointWriter,
      }).catch((error: unknown) => {
        this.handleAsyncFailure({
          projectId: args.projectId,
          processId: args.processId,
          environmentId: args.environmentId,
          contextLabel: 'checkpoint',
          error,
        });
      });
    }, 0);
  }

  private async executeCheckpoint(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    executionResult: ExecutionResult;
    checkpointPlanner: CheckpointPlanner;
    codeCheckpointWriter: CodeCheckpointWriter;
  }): Promise<void> {
    const currentProcess = await this.platformStore.getProcessRecord({
      processId: args.processId,
    });

    if (currentProcess === null) {
      return;
    }

    const existingEnvironment = await this.platformStore.getProcessEnvironmentSummary({
      processId: args.processId,
    });
    const providerKind = await this.getAuthoritativeProviderKind(args.processId);
    const existingMaterialRefs = await this.platformStore.getCurrentProcessMaterialRefs({
      processId: args.processId,
    });
    const projectSourceAttachments = await this.platformStore.listProjectSourceAttachments({
      projectId: currentProcess.projectId,
    });
    const currentSourceIds = new Set(existingMaterialRefs.sourceAttachmentIds);
    const currentSourceAttachments =
      currentSourceIds.size === 0
        ? projectSourceAttachments
        : projectSourceAttachments.filter((source) =>
            currentSourceIds.has(source.sourceAttachmentId),
          );
    const sourceSummariesById = new Map(
      currentSourceAttachments.map((source) => [source.sourceAttachmentId, source]),
    );

    let artifactCheckpointResult: LastCheckpointResult | null = null;

    try {
      const adapter = this.providerAdapterRegistry.resolve(providerKind);
      const ensuredWorkspaceHandle = await this.resolveWorkspaceHandle({
        adapter,
        processId: args.processId,
        environmentId: args.environmentId,
      });
      const candidate = await this.buildLegacyCheckpointCandidate({
        artifactCandidates: args.executionResult.artifactCheckpointCandidates,
        codeCandidates: args.executionResult.codeCheckpointCandidates,
        workspaceHandle: ensuredWorkspaceHandle,
      });
      const plan = await args.checkpointPlanner.planFor({
        processId: args.processId,
        candidate,
        sourceAccessModes: buildSourceAccessModes({
          codeTargets: candidate.codeDiffs ?? [],
          sourceSummaries: currentSourceAttachments,
        }),
      });

      if (plan.artifactTargets.length > 0) {
        await this.artifactCheckpointPersistence.persistCheckpointArtifacts({
          processId: args.processId,
          artifacts: plan.artifactTargets,
        });
        artifactCheckpointResult = buildCheckpointResult({
          checkpointKind: 'artifact',
          outcome: 'succeeded',
          targetLabel: plan.artifactTargets[0]?.targetLabel ?? 'Checkpoint artifact',
          targetRef: null,
          completedAt: plan.artifactTargets[0]?.producedAt ?? new Date().toISOString(),
          failureReason: null,
        });

        const artifactEnvironment = await this.upsertEnvironmentState({
          processId: args.processId,
          providerKind,
          state: 'checkpointing',
          environmentId: args.environmentId,
          blockedReason: null,
          lastHydratedAt: existingEnvironment.lastHydratedAt,
          lastCheckpointAt: artifactCheckpointResult.completedAt,
          lastCheckpointResult: artifactCheckpointResult,
        });
        const materials = await this.readMaterials({
          projectId: currentProcess.projectId,
          processId: args.processId,
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: artifactEnvironment,
          materials,
        });
      }

      if (plan.codeTargets.length > 0) {
        const codeOutcomes = await Promise.all(
          plan.codeTargets.map(async (target) => ({
            target,
            writeResult: await args.codeCheckpointWriter.writeFor(target),
          })),
        );
        const firstFailure = codeOutcomes.find(
          (outcome) => outcome.writeResult.outcome === 'failed',
        );

        if (firstFailure !== undefined) {
          const failedCodeResult = buildCheckpointResult({
            checkpointKind: 'code',
            outcome: 'failed',
            targetLabel: resolveCheckpointTargetLabel(firstFailure.target, sourceSummariesById),
            targetRef: resolveCheckpointTargetRef(firstFailure.target, sourceSummariesById),
            completedAt: new Date().toISOString(),
            failureReason: firstFailure.writeResult.failureReason ?? 'Code checkpoint failed.',
          });
          const failedEnvironment = await this.upsertEnvironmentState({
            processId: args.processId,
            providerKind,
            state: 'failed',
            environmentId: args.environmentId,
            blockedReason: failedCodeResult.failureReason,
            lastHydratedAt: existingEnvironment.lastHydratedAt,
            lastCheckpointAt: failedCodeResult.completedAt,
            lastCheckpointResult: failedCodeResult,
          });
          const checkpointFailedHistoryItem = await this.appendProcessEvent({
            processId: args.processId,
            text: 'Checkpoint failed.',
          });
          this.publishEnvironmentUpsert({
            projectId: args.projectId,
            processId: args.processId,
            process: currentProcess,
            environment: failedEnvironment,
            historyItems: [checkpointFailedHistoryItem],
          });
          return;
        }

        const successfulCodeTarget = codeOutcomes[0]?.target ?? plan.codeTargets[0];
        const finalCheckpointResult = buildCheckpointResult({
          checkpointKind: plan.artifactTargets.length > 0 ? 'mixed' : 'code',
          outcome: 'succeeded',
          targetLabel:
            plan.artifactTargets.length > 0
              ? `${plan.artifactTargets[0]?.targetLabel ?? 'Checkpoint artifact'} + ${resolveCheckpointTargetLabel(successfulCodeTarget, sourceSummariesById)}`
              : resolveCheckpointTargetLabel(successfulCodeTarget, sourceSummariesById),
          targetRef: resolveCheckpointTargetRef(successfulCodeTarget, sourceSummariesById),
          completedAt: new Date().toISOString(),
          failureReason: null,
        });
        const readyEnvironment = await this.upsertEnvironmentState({
          processId: args.processId,
          providerKind,
          state: 'ready',
          environmentId: args.environmentId,
          blockedReason: null,
          lastHydratedAt: existingEnvironment.lastHydratedAt,
          lastCheckpointAt: finalCheckpointResult.completedAt,
          lastCheckpointResult: finalCheckpointResult,
        });
        const checkpointSucceededHistoryItem = await this.appendProcessEvent({
          processId: args.processId,
          text: 'Checkpoint succeeded.',
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: readyEnvironment,
          historyItems: [checkpointSucceededHistoryItem],
        });
        return;
      }

      if (plan.skippedReadOnly.length > 0 && plan.artifactTargets.length === 0) {
        const skippedTarget = plan.skippedReadOnly[0];
        const failedReadOnlyResult = buildCheckpointResult({
          checkpointKind: 'code',
          outcome: 'failed',
          targetLabel:
            sourceSummariesById.get(skippedTarget?.sourceAttachmentId ?? '')?.displayName ??
            skippedTarget?.sourceAttachmentId ??
            'Attached source',
          targetRef:
            sourceSummariesById.get(skippedTarget?.sourceAttachmentId ?? '')?.targetRef ?? null,
          completedAt: new Date().toISOString(),
          failureReason: 'Code checkpoint was blocked because the attached source is not writable.',
        });
        const failedEnvironment = await this.upsertEnvironmentState({
          processId: args.processId,
          providerKind,
          state: 'failed',
          environmentId: args.environmentId,
          blockedReason: failedReadOnlyResult.failureReason,
          lastHydratedAt: existingEnvironment.lastHydratedAt,
          lastCheckpointAt: failedReadOnlyResult.completedAt,
          lastCheckpointResult: failedReadOnlyResult,
        });
        const checkpointFailedHistoryItem = await this.appendProcessEvent({
          processId: args.processId,
          text: 'Checkpoint failed.',
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: failedEnvironment,
          historyItems: [checkpointFailedHistoryItem],
        });
        return;
      }

      const readyEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        providerKind,
        state: 'ready',
        environmentId: args.environmentId,
        blockedReason: null,
        lastHydratedAt: existingEnvironment.lastHydratedAt,
        lastCheckpointAt: artifactCheckpointResult?.completedAt,
        lastCheckpointResult: artifactCheckpointResult ?? undefined,
      });
      const checkpointSucceededHistoryItem =
        artifactCheckpointResult === null
          ? null
          : await this.appendProcessEvent({
              processId: args.processId,
              text: 'Checkpoint succeeded.',
            });
      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: currentProcess,
        environment: readyEnvironment,
        historyItems:
          checkpointSucceededHistoryItem === null ? undefined : [checkpointSucceededHistoryItem],
      });
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'Unknown checkpoint error';
      const failedCheckpointResult = buildCheckpointResult({
        checkpointKind: artifactCheckpointResult === null ? 'artifact' : 'code',
        outcome: 'failed',
        targetLabel: artifactCheckpointResult?.targetLabel ?? 'Checkpoint artifact',
        targetRef: artifactCheckpointResult?.targetRef ?? null,
        completedAt: new Date().toISOString(),
        failureReason,
      });
      const failedEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        providerKind,
        state: 'failed',
        environmentId: args.environmentId,
        blockedReason: failureReason,
        lastHydratedAt: existingEnvironment.lastHydratedAt,
        lastCheckpointAt: failedCheckpointResult.completedAt,
        lastCheckpointResult: failedCheckpointResult,
      });
      const checkpointFailedHistoryItem = await this.appendProcessEvent({
        processId: args.processId,
        text: 'Checkpoint failed.',
      });
      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: currentProcess,
        environment: failedEnvironment,
        historyItems: [checkpointFailedHistoryItem],
      });
    }
  }

  /**
   * Resolves the absolute filesystem workspace handle for `environmentId`. For
   * `LocalProviderAdapter`, this is the actual working tree the script ran in.
   * For other providers (`InMemory`, `Daytona` skeleton), there is no usable
   * workspace handle for the orchestrator, so we return `null` and let
   * `resolveCandidateContents` decide whether the ref is a supported synthetic
   * URI (`mem://...`) or an unreadable filesystem path that should fail.
   */
  private async resolveWorkspaceHandle(args: {
    adapter: ProviderAdapter;
    processId: string;
    environmentId: string;
  }): Promise<string | null> {
    // Adapters that expose `getWorkspaceHandle` (LocalProviderAdapter) can
    // return the working-tree path directly. For others we leave the handle
    // null and fail later if a filesystem-backed candidate cannot be resolved.
    const candidate = args.adapter as ProviderAdapter & {
      getWorkspaceHandle?: (args: { environmentId: string }) => string | null;
    };
    if (typeof candidate.getWorkspaceHandle === 'function') {
      try {
        return candidate.getWorkspaceHandle({ environmentId: args.environmentId });
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Bridges the spec'd `ExecutionResult` checkpoint candidates into the
   * `CheckpointPlanner`'s legacy `CheckpointCandidate` shape. The planner still
   * thinks in `{ artifacts: [{ contents }], codeDiffs: [{ diff }] }` — Chunk 2
   * reuses that planner unchanged and resolves `contentsRef` / `workspaceRef`
   * to actual content here, failing fast if a filesystem-backed ref cannot be
   * read.
   */
  private async buildLegacyCheckpointCandidate(args: {
    artifactCandidates: ArtifactCheckpointCandidate[];
    codeCandidates: CodeCheckpointCandidate[];
    workspaceHandle: string | null;
  }): Promise<{ artifacts: CheckpointArtifact[]; codeDiffs: CodeDiff[] }> {
    const nowIso = new Date().toISOString();

    const artifacts: CheckpointArtifact[] = await Promise.all(
      args.artifactCandidates.map(async (candidate) => ({
        artifactId: candidate.artifactId,
        producedAt: nowIso,
        contents: await resolveCandidateContents({
          ref: candidate.contentsRef,
          workspaceHandle: args.workspaceHandle,
        }),
        targetLabel: candidate.displayName,
      })),
    );

    const codeDiffs: CodeDiff[] = await Promise.all(
      args.codeCandidates.map(async (candidate) => ({
        sourceAttachmentId: candidate.sourceAttachmentId,
        targetRef: candidate.targetRef ?? undefined,
        diff: await resolveCandidateContents({
          ref: candidate.workspaceRef,
          workspaceHandle: args.workspaceHandle,
        }),
      })),
    );

    return { artifacts, codeDiffs };
  }

  private publishEnvironmentUpsert(args: {
    projectId: string;
    processId: string;
    process: ProcessSummary | null;
    environment: EnvironmentSummary;
    historyItems?: ProcessHistoryItem[];
    currentRequest?: CurrentProcessRequest | null;
    materials?: ProcessMaterialsSectionEnvelope;
    sideWork?: SideWorkSectionEnvelope;
  }): void {
    if (args.process === null) {
      return;
    }

    this.processLiveHub.publish({
      projectId: args.projectId,
      processId: args.processId,
      publication: {
        messageType: 'upsert',
        process: buildProcessSurfaceSummary(args.process, args.environment),
        historyItems: args.historyItems,
        currentRequest: args.currentRequest,
        materials: args.materials,
        sideWork: args.sideWork,
        environment: args.environment,
      },
    });
  }

  private async publishRecoveryOutcome(args: {
    projectId: string;
    processId: string;
    environment: EnvironmentSummary;
  }): Promise<void> {
    const currentProcess = await this.platformStore.getProcessRecord({
      processId: args.processId,
    });

    this.publishEnvironmentUpsert({
      projectId: args.projectId,
      processId: args.processId,
      process: currentProcess,
      environment: args.environment,
    });
  }

  private async publishRecoveryFailure(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    failureReason: string;
  }): Promise<void> {
    try {
      const currentEnvironment = await this.platformStore.getProcessEnvironmentSummary({
        processId: args.processId,
      });
      const failedEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        state: 'failed',
        environmentId: args.environmentId,
        blockedReason: args.failureReason,
        lastHydratedAt: currentEnvironment.lastHydratedAt,
      });
      await this.publishRecoveryOutcome({
        projectId: args.projectId,
        processId: args.processId,
        environment: failedEnvironment,
      });
    } catch (secondaryError) {
      // eslint-disable-next-line no-console
      console.error('[process-environment] secondary failure during publishRecoveryFailure', {
        processId: args.processId,
        environmentId: args.environmentId,
        primaryReason: args.failureReason,
        secondaryError:
          secondaryError instanceof Error ? secondaryError.message : String(secondaryError),
      });
    }
  }

  /**
   * Defensive last-resort handler for fire-and-forget paths that reject before
   * any inner try/catch can surface them as visible env state. Transitions the
   * environment to `failed` if possible and publishes an environment upsert
   * with a meaningful blocked reason. Never re-throws.
   */
  private handleAsyncFailure(args: {
    projectId: string;
    processId: string;
    environmentId: string | null;
    contextLabel: string;
    error: unknown;
  }): void {
    const failureReason =
      args.error instanceof Error
        ? `${args.contextLabel} failed: ${args.error.message}`
        : `${args.contextLabel} failed with unknown error.`;

    void (async () => {
      try {
        const existing = await this.platformStore.getProcessEnvironmentSummary({
          processId: args.processId,
        });
        const failed = await this.upsertEnvironmentState({
          processId: args.processId,
          state: 'failed',
          environmentId: args.environmentId ?? existing.environmentId,
          blockedReason: failureReason,
          lastHydratedAt: existing.lastHydratedAt,
        });
        const currentProcess = await this.platformStore.getProcessRecord({
          processId: args.processId,
        });
        if (currentProcess !== null) {
          this.publishEnvironmentUpsert({
            projectId: args.projectId,
            processId: args.processId,
            process: currentProcess,
            environment: failed,
          });
        } else {
          this.processLiveHub.publish({
            projectId: args.projectId,
            processId: args.processId,
            publication: { messageType: 'upsert', environment: failed },
          });
        }
      } catch (secondaryError) {
        // eslint-disable-next-line no-console
        console.error('[process-environment] handleAsyncFailure could not transition to failed', {
          processId: args.processId,
          environmentId: args.environmentId,
          contextLabel: args.contextLabel,
          primaryReason: failureReason,
          secondaryError:
            secondaryError instanceof Error ? secondaryError.message : String(secondaryError),
        });
      }
    })();
  }

  /**
   * Single helper that transitions to `failed` and publishes the failed env
   * upsert. Used by `executeHydration` so any post-ready transition error and
   * any hydration error route through the same visible-failure path.
   */
  private async transitionToFailed(args: {
    projectId: string;
    processId: string;
    environmentId: string | null;
    previousLastHydratedAt: string | null;
    failureReason: string | null;
  }): Promise<void> {
    try {
      const failedEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        state: 'failed',
        environmentId: args.environmentId,
        blockedReason: args.failureReason,
        lastHydratedAt: args.previousLastHydratedAt,
      });
      const currentProcess = await this.platformStore.getProcessRecord({
        processId: args.processId,
      });

      if (currentProcess !== null) {
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: failedEnvironment,
        });
      } else {
        this.processLiveHub.publish({
          projectId: args.projectId,
          processId: args.processId,
          publication: {
            messageType: 'upsert',
            environment: failedEnvironment,
          },
        });
      }
    } catch (secondaryError) {
      // eslint-disable-next-line no-console
      console.error('[process-environment] transitionToFailed itself failed', {
        processId: args.processId,
        environmentId: args.environmentId,
        primaryReason: args.failureReason,
        secondaryError:
          secondaryError instanceof Error ? secondaryError.message : String(secondaryError),
      });
    }
  }

  private async buildHydrationPlan(processId: string): Promise<WorkingSetPlan> {
    const [materialRefs, currentOutputs] = await Promise.all([
      this.platformStore.getCurrentProcessMaterialRefs({ processId }),
      this.platformStore.listProcessOutputs({ processId }),
    ]);

    return planHydrationWorkingSet({
      ...materialRefs,
      outputIds: currentOutputs.map((output) => output.outputId),
    });
  }

  /**
   * Enriches the durable `WorkingSetPlan` (just IDs) into the spec's
   * `HydrationPlan` (display names, version labels, accessMode) by reading
   * canonical artifact / source / output projections. The adapter receives the
   * richer projection so it can write meaningful filenames into the working
   * tree and decide what to clone.
   *
   * `fingerprint` rides through unchanged for now — Chunk 1 introduced the
   * stored fingerprint, and Chunk 2 propagates it without recomputation here.
   */
  private async buildAdapterHydrationPlan(args: {
    projectId: string;
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<HydrationPlan> {
    const [artifacts, sources, outputs] = await Promise.all([
      this.platformStore.listProjectArtifacts({ projectId: args.projectId }),
      this.platformStore.listProjectSourceAttachments({ projectId: args.projectId }),
      this.platformStore.listProcessOutputs({ processId: args.processId }),
    ]);

    const artifactById = new Map(artifacts.map((artifact) => [artifact.artifactId, artifact]));
    const sourceById = new Map(sources.map((source) => [source.sourceAttachmentId, source]));
    const outputById = new Map(outputs.map((output) => [output.outputId, output]));

    // Chunk 1 added the durable `workingSetFingerprint` on the Convex env state
    // row but did not extend the `EnvironmentSummary` contract with that field.
    // Until that contract addition lands, propagate an empty fingerprint to the
    // adapter — the adapter currently echoes it back into HydrationResult and
    // the orchestrator does not yet stale-compare here.
    return {
      fingerprint: '',
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
        return {
          sourceAttachmentId,
          displayName: source?.displayName ?? sourceAttachmentId,
          targetRef: source?.targetRef ?? null,
          accessMode: source?.accessMode ?? 'read_only',
        };
      }),
    };
  }

  private async appendProcessEvent(args: {
    processId: string;
    text: string;
  }): Promise<ProcessHistoryItem> {
    return this.platformStore.appendProcessHistoryItem({
      processId: args.processId,
      kind: 'process_event',
      lifecycleState: 'finalized',
      text: args.text,
      relatedSideWorkId: null,
      relatedArtifactId: null,
      clientRequestId: null,
    });
  }

  private publishHistoryUpsert(args: {
    projectId: string;
    processId: string;
    historyItems: ProcessHistoryItem[];
  }): void {
    this.processLiveHub.publish({
      projectId: args.projectId,
      processId: args.processId,
      publication: {
        messageType: 'upsert',
        historyItems: args.historyItems,
      },
    });
  }

  private async readMaterials(args: {
    projectId: string;
    processId: string;
  }): Promise<ProcessMaterialsSectionEnvelope> {
    return new MaterialsSectionReader(this.platformStore).read(args);
  }

  private async readSideWork(args: { processId: string }): Promise<SideWorkSectionEnvelope> {
    return new SideWorkSectionReader(this.platformStore).read(args);
  }

  private async transitionProcessForExecutionStatus(args: {
    processId: string;
    processStatus: ExecutionResult['processStatus'];
  }): Promise<{
    process: ProcessSummary;
    currentRequest: CurrentProcessRequest | null;
  }> {
    switch (args.processStatus) {
      case 'running':
        return this.platformStore.transitionProcessToRunning({
          processId: args.processId,
        });
      case 'waiting':
        return this.platformStore.transitionProcessToWaiting({
          processId: args.processId,
        });
      case 'completed':
        return this.platformStore.transitionProcessToCompleted({
          processId: args.processId,
        });
      case 'interrupted':
        return this.platformStore.transitionProcessToInterrupted({
          processId: args.processId,
        });
      case 'failed':
        throw new Error('Failed executions do not transition via the lifecycle helper.');
    }
  }

  private assertRehydrateAvailable(environment: EnvironmentSummary): void {
    if (environment.state === 'unavailable') {
      throw new AppError({
        code: processEnvironmentUnavailableErrorCode,
        message:
          environment.blockedReason ?? 'Environment lifecycle work is currently unavailable.',
        statusCode: 503,
      });
    }

    const canRehydrate =
      (environment.state === 'stale' || environment.state === 'failed') &&
      environment.environmentId !== null;

    if (canRehydrate) {
      return;
    }

    if (
      environment.state === 'lost' ||
      ((environment.state === 'stale' || environment.state === 'failed') &&
        environment.environmentId === null)
    ) {
      throw new AppError({
        code: processEnvironmentNotRecoverableErrorCode,
        message: 'Rehydrate is blocked because rebuild is required first.',
        statusCode: 409,
      });
    }

    throw new AppError({
      code: 'PROCESS_ACTION_NOT_AVAILABLE',
      message: 'Rehydrate is not available for this process right now.',
      statusCode: 409,
    });
  }

  private assertRebuildAvailable(environment: EnvironmentSummary): void {
    if (environment.state === 'unavailable') {
      throw new AppError({
        code: processEnvironmentUnavailableErrorCode,
        message:
          environment.blockedReason ?? 'Environment lifecycle work is currently unavailable.',
        statusCode: 503,
      });
    }

    if (environment.state === 'lost' || environment.state === 'failed') {
      return;
    }

    throw new AppError({
      code: 'PROCESS_ACTION_NOT_AVAILABLE',
      message: 'Rebuild is not available for this process right now.',
      statusCode: 409,
    });
  }
}

function hasCanonicalRecoveryMaterials(plan: WorkingSetPlan): boolean {
  return (
    plan.artifactIds.length > 0 || plan.sourceAttachmentIds.length > 0 || plan.outputIds.length > 0
  );
}

function buildRebuildingEnvironmentId(processId: string): string {
  return `env-rebuilt-${processId}`;
}

function buildCheckpointResult(args: {
  checkpointKind: LastCheckpointResult['checkpointKind'];
  outcome: LastCheckpointResult['outcome'];
  targetLabel: string;
  targetRef: string | null;
  completedAt: string;
  failureReason: string | null;
}): LastCheckpointResult {
  return {
    checkpointId: `checkpoint:${args.checkpointKind}:${args.completedAt}`,
    checkpointKind: args.checkpointKind,
    outcome: args.outcome,
    targetLabel: args.targetLabel,
    targetRef: args.targetRef,
    completedAt: args.completedAt,
    failureReason: args.failureReason,
  };
}

function buildSourceAccessModes(args: {
  codeTargets: Array<{ sourceAttachmentId: string }>;
  sourceSummaries: SourceAttachmentSummary[];
}): Record<string, SourceAttachmentSummary['accessMode']> {
  const sourceAccessModes = Object.fromEntries(
    args.sourceSummaries.map((source) => [source.sourceAttachmentId, source.accessMode]),
  ) as Record<string, SourceAttachmentSummary['accessMode']>;

  for (const codeTarget of args.codeTargets) {
    sourceAccessModes[codeTarget.sourceAttachmentId] ??= 'read_only';
  }

  return sourceAccessModes;
}

function resolveCheckpointTargetLabel(
  target: CodeCheckpointTarget | undefined,
  sourceSummariesById: Map<string, SourceAttachmentSummary>,
): string {
  if (target === undefined) {
    return 'Attached source';
  }

  return (
    sourceSummariesById.get(target.sourceAttachmentId)?.displayName ?? target.sourceAttachmentId
  );
}

function resolveCheckpointTargetRef(
  target: CodeCheckpointTarget | undefined,
  sourceSummariesById: Map<string, SourceAttachmentSummary>,
): string | null {
  if (target === undefined) {
    return null;
  }

  return target.targetRef ?? sourceSummariesById.get(target.sourceAttachmentId)?.targetRef ?? null;
}

function extractExecutionFailureReason(executionResult: ExecutionResult): string {
  // Spec: ExecutionResult does not carry a top-level `failureReason`. The
  // canonical place for the failure description is the `processHistoryItems`
  // entries the script produced. Take the most recent finalized text, falling
  // back to the generic label so the env summary always has a non-empty
  // blockedReason for failed runs.
  const lastFailureItem = [...executionResult.processHistoryItems]
    .reverse()
    .find((item) => item.lifecycleState === 'finalized' && item.text.trim().length > 0);
  if (lastFailureItem !== undefined) {
    return lastFailureItem.text;
  }
  return 'Execution failed.';
}

/**
 * Resolves a candidate `contentsRef` / `workspaceRef` to actual textual
 * content. For LocalProvider, refs are filesystem paths (absolute or relative
 * to the working tree) and unreadable paths are treated as real failures. Test
 * fakes may still use synthetic URI schemes such as `mem://...`, which remain
 * pass-through placeholders for deterministic tests.
 */
async function resolveCandidateContents(args: {
  ref: string;
  workspaceHandle: string | null;
}): Promise<string> {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(args.ref)) {
    // Non-filesystem URI scheme (mem://, data://, etc.) — test-fake territory.
    return args.ref;
  }

  const absolutePath = path.isAbsolute(args.ref)
    ? args.ref
    : args.workspaceHandle === null
      ? null
      : path.resolve(args.workspaceHandle, args.ref);

  if (absolutePath === null) {
    throw new Error(
      `Checkpoint candidate '${args.ref}' could not be resolved because no workspace handle was available.`,
    );
  }

  try {
    return await fs.readFile(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Checkpoint candidate '${args.ref}' could not be read from '${absolutePath}': ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }
}

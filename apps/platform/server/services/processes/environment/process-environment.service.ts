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
import { ArchiveFinalizationService } from '../../archive/archive-finalization.service.js';
import type { AuthenticatedActor } from '../../auth/auth-session.service.js';
import type {
  ArtifactVersionRecord,
  PlatformStore,
  StoredSourceProvenanceRecord,
  WorkingSetPlan,
} from '../../projects/platform-store.js';
import type { SourceProvenanceService } from '../../sources/source-provenance.service.js';
import type { ProcessLiveHub } from '../live/process-live-hub.js';
import type { ProcessAccessService } from '../process-access.service.js';
import { resolveActiveProcessSourceAttachments } from '../active-process-sources.js';
import { buildProcessSurfaceSummary } from '../process-work-surface.service.js';
import { MaterialsSectionReader } from '../readers/materials-section.reader.js';
import { SideWorkSectionReader } from '../readers/side-work-section.reader.js';
import type { CheckpointPlanner } from './checkpoint-planner.js';
import type { CheckpointArtifact, CodeCheckpointTarget, CodeDiff } from './checkpoint-types.js';
import type { CodeCheckpointWriter } from './code-checkpoint-writer.js';
import { planHydrationWorkingSet } from './hydration-planner.js';
import type {
  ArtifactCheckpointCandidate,
  CodeCheckpointCandidate,
  ExecutionResult,
  HydrationPlan,
  ProviderAdapter,
  ProviderFailureState,
  RuntimeArchiveEntry,
} from './provider-adapter.js';
import { ProviderLifecycleError } from './provider-adapter.js';
import type { ProviderAdapterRegistry } from './provider-adapter-registry.js';
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
    private readonly defaultEnvironmentProviderKind: 'daytona' | 'local' = 'daytona',
    private readonly artifactCheckpointPersistence: Pick<
      PlatformStore,
      'persistCheckpointArtifacts' | 'getLatestArtifactVersion'
    > = platformStore,
    private readonly sourceProvenanceService?: SourceProvenanceService,
    private readonly archiveFinalizationService: Pick<
      ArchiveFinalizationService,
      'appendFinalizedEntry' | 'appendFromProcessHistoryItem'
    > = new ArchiveFinalizationService(platformStore),
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
      providerKind,
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
      providerKind,
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
      projectId: access.project.projectId,
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
      projectId: args.projectId,
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
    let hydrationFailureState: ProviderFailureState = 'failed';

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
      hydrationFailureState = mapProviderFailureState(error);
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
        failureState: hydrationFailureState,
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
        failureState: mapProviderFailureState(error),
      });
    }
  }

  private async executeRebuild(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    plan: WorkingSetPlan;
  }): Promise<void> {
    const [providerKind, currentProcess, existingEnvironment] = await Promise.all([
      this.getAuthoritativeProviderKind(args.processId),
      this.platformStore.getProcessRecord({
        processId: args.processId,
      }),
      this.platformStore.getProcessEnvironmentSummary({
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
        previousEnvironmentId:
          args.environmentId === buildRebuildingEnvironmentId(args.processId)
            ? existingEnvironment.environmentId
            : args.environmentId,
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
        failureState: mapProviderFailureState(error),
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
        processContext: {
          processId: currentProcess.processId,
          displayLabel: currentProcess.displayLabel,
          processType: currentProcess.processType,
          status: currentProcess.status,
        },
        currentSources: await this.listCurrentExecutionSources({
          projectId: currentProcess.projectId,
          processId: args.processId,
        }),
      });

      // Apply ExecutionResult side effects (history items, output writes, side-work writes)
      // before deciding the next env state. These produce durable process-facing updates
      // even when the run failed, so the process surface reflects what happened.
      const sideEffects = await this.applyExecutionResultSideEffects({
        projectId: args.projectId,
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
      const informedWorkProvenanceRecords =
        (await this.sourceProvenanceService?.recordInformedWorkForCurrentSources({
          projectId: currentProcess.projectId,
          processId: args.processId,
          usedSourceAttachmentIds: deriveUsedSourceAttachmentIds(executionResult),
        })) ?? [];
      await this.reconcileDeferredArchiveEntries({
        projectId: args.projectId,
        processId: args.processId,
        archiveEntries: sideEffects.deferredArchiveEntries,
        informedWorkProvenanceRecords,
        checkpointArtifactVersions: [],
        receivedCodeUpdateProvenanceRecords: [],
      });

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
          projectId: args.projectId,
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

      if (this.checkpointPlanner !== undefined && this.codeCheckpointWriter !== undefined) {
        this.runCheckpointAsync({
          projectId: args.projectId,
          processId: args.processId,
          environmentId: args.environmentId,
          executionResult,
          deferredArchiveEntries: sideEffects.deferredArchiveEntries,
          informedWorkProvenanceRecords,
        });
      }
    } catch (error) {
      try {
        const failedEnvironment = await this.upsertEnvironmentState({
          processId: args.processId,
          providerKind,
          state: mapProviderFailureState(error),
          environmentId: args.environmentId,
          blockedReason: error instanceof Error ? error.message : 'Unknown execution error',
          lastHydratedAt,
        });
        const executionFailedHistoryItem = await this.appendProcessEvent({
          projectId: args.projectId,
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
    projectId: string;
    processId: string;
    executionResult: ExecutionResult;
  }): Promise<{
    historyItems: ProcessHistoryItem[];
    deferredArchiveEntries: RuntimeArchiveEntry[];
  }> {
    const historyItems: ProcessHistoryItem[] = [];
    const deferredArchiveEntries: RuntimeArchiveEntry[] = [];

    for (const historyItem of args.executionResult.processHistoryItems) {
      const storedHistoryItem = await this.platformStore.appendProcessHistoryItem({
        processId: args.processId,
        kind: historyItem.kind,
        lifecycleState: historyItem.lifecycleState,
        text: historyItem.text,
        relatedSideWorkId: historyItem.relatedSideWorkId,
        relatedArtifactId: historyItem.relatedArtifactId,
        clientRequestId: null,
        providerHistoryItemId: historyItem.historyItemId,
      });
      historyItems.push(storedHistoryItem);
      await this.archiveFinalizationService.appendFromProcessHistoryItem({
        projectId: args.projectId,
        processId: args.processId,
        historyItem: storedHistoryItem,
      });
    }

    for (const archiveEntry of args.executionResult.archiveEntries ?? []) {
      const isDeferredArchiveEntry = archiveEntryRequiresDeferredRelations(archiveEntry);
      if (isDeferredArchiveEntry) {
        deferredArchiveEntries.push(archiveEntry);
      }
      const degradationReason = isDeferredArchiveEntry
        ? buildDeferredArchiveDegradationReason({
            archiveEntry,
            artifactVersion: null,
            sourceProvenanceRecord: null,
          })
        : (archiveEntry.degradationReason ?? null);

      await this.archiveFinalizationService.appendFinalizedEntry({
        projectId: args.projectId,
        processId: args.processId,
        entryKind: archiveEntry.entryKind,
        finalizationKey: archiveEntry.finalizationKey,
        sourceObjectId: archiveEntry.sourceObjectId,
        bodyText: archiveEntry.bodyText,
        bodyData: archiveEntry.bodyData,
        bodyFormat: archiveEntry.bodyFormat,
        relatedArtifactVersionId: archiveEntry.relatedArtifactVersionId ?? null,
        relatedSourceProvenanceId: archiveEntry.relatedSourceProvenanceId ?? null,
        relatedToolCallId: archiveEntry.relatedToolCallId ?? null,
        entryStatus:
          degradationReason === null ? (archiveEntry.entryStatus ?? 'ready') : 'degraded',
        degradationReason,
        recordedAt: archiveEntry.recordedAt,
      });
    }

    await this.platformStore.replaceCurrentProcessOutputs({
      processId: args.processId,
      outputs: args.executionResult.outputWrites,
    });

    await this.platformStore.replaceCurrentProcessSideWorkItems({
      processId: args.processId,
      items: args.executionResult.sideWorkWrites,
    });

    return { historyItems, deferredArchiveEntries };
  }
  private async reconcileDeferredArchiveEntries(args: {
    projectId: string;
    processId: string;
    archiveEntries: RuntimeArchiveEntry[];
    informedWorkProvenanceRecords: StoredSourceProvenanceRecord[];
    checkpointArtifactVersions: ArtifactVersionRecord[];
    receivedCodeUpdateProvenanceRecords: StoredSourceProvenanceRecord[];
  }): Promise<void> {
    const informedWorkBySourceAttachmentId = new Map(
      args.informedWorkProvenanceRecords.map((record) => [record.sourceAttachmentId, record]),
    );
    const receivedCodeUpdateBySourceAttachmentId = new Map(
      args.receivedCodeUpdateProvenanceRecords.map((record) => [record.sourceAttachmentId, record]),
    );

    for (const archiveEntry of args.archiveEntries) {
      const artifactVersion =
        archiveEntry.artifactCheckpointIndex === undefined ||
        archiveEntry.artifactCheckpointIndex === null
          ? null
          : (args.checkpointArtifactVersions[archiveEntry.artifactCheckpointIndex] ?? null);
      const sourceProvenanceRecord =
        archiveEntry.sourceProvenanceBinding === undefined ||
        archiveEntry.sourceProvenanceBinding === null
          ? null
          : archiveEntry.sourceProvenanceBinding.relationshipKind === 'received_code_update'
            ? (receivedCodeUpdateBySourceAttachmentId.get(
                archiveEntry.sourceProvenanceBinding.sourceAttachmentId,
              ) ?? null)
            : (informedWorkBySourceAttachmentId.get(
                archiveEntry.sourceProvenanceBinding.sourceAttachmentId,
              ) ?? null);
      const degradationReason = buildDeferredArchiveDegradationReason({
        archiveEntry,
        artifactVersion,
        sourceProvenanceRecord,
      });

      await this.platformStore.patchArchiveEntry({
        processId: args.processId,
        finalizationKey: archiveEntry.finalizationKey,
        relatedArtifactVersionId:
          archiveEntry.relatedArtifactVersionId ?? artifactVersion?.versionId ?? null,
        relatedSourceProvenanceId:
          archiveEntry.relatedSourceProvenanceId ?? sourceProvenanceRecord?.provenanceId ?? null,
        relatedToolCallId: archiveEntry.relatedToolCallId ?? null,
        entryStatus:
          degradationReason === null ? (archiveEntry.entryStatus ?? 'ready') : 'degraded',
        degradationReason,
      });
    }
  }

  private async listCurrentExecutionSources(args: { projectId: string; processId: string }) {
    const [existingMaterialRefs, projectSourceAttachments] = await Promise.all([
      this.platformStore.getCurrentProcessMaterialRefs({
        processId: args.processId,
      }),
      this.platformStore.listProjectSourceAttachments({
        projectId: args.projectId,
      }),
    ]);

    return resolveActiveProcessSourceAttachments({
      sourceAttachments: projectSourceAttachments,
      processId: args.processId,
      currentSourceAttachmentIds: existingMaterialRefs.sourceAttachmentIds,
    }).map((sourceAttachment) => ({
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      displayName: sourceAttachment.displayName,
      targetRef: sourceAttachment.targetRef,
      accessMode: sourceAttachment.accessMode,
    }));
  }

  private runCheckpointAsync(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    executionResult: ExecutionResult;
    deferredArchiveEntries: RuntimeArchiveEntry[];
    informedWorkProvenanceRecords: StoredSourceProvenanceRecord[];
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
    deferredArchiveEntries: RuntimeArchiveEntry[];
    informedWorkProvenanceRecords: StoredSourceProvenanceRecord[];
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
    const currentSourceAttachments = resolveActiveProcessSourceAttachments({
      sourceAttachments: projectSourceAttachments,
      processId: args.processId,
      currentSourceAttachmentIds: existingMaterialRefs.sourceAttachmentIds,
    });
    const sourceSummariesById = new Map(
      currentSourceAttachments.map((source) => [source.sourceAttachmentId, source]),
    );

    let artifactCheckpointResult: LastCheckpointResult | null = null;
    let checkpointArtifactVersions: ArtifactVersionRecord[] = [];

    try {
      const adapter = this.providerAdapterRegistry.resolve(providerKind);
      const candidate = await this.buildLegacyCheckpointCandidate({
        adapter,
        environmentId: args.environmentId,
        artifactCandidates: args.executionResult.artifactCheckpointCandidates,
        codeCandidates: args.executionResult.codeCheckpointCandidates,
        sourceSummariesById,
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
        const persistedOutputs =
          await this.artifactCheckpointPersistence.persistCheckpointArtifacts({
            processId: args.processId,
            artifacts: plan.artifactTargets,
          });
        checkpointArtifactVersions = (
          await Promise.all(
            persistedOutputs.map(async (output) => {
              if (output.linkedArtifactId === null) {
                return null;
              }

              return await this.artifactCheckpointPersistence.getLatestArtifactVersion({
                artifactId: output.linkedArtifactId,
              });
            }),
          )
        ).filter((version): version is ArtifactVersionRecord => version !== null);
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
        const successfulCodeTargets = codeOutcomes
          .filter((outcome) => outcome.writeResult.outcome === 'succeeded')
          .map((outcome) => outcome.target);

        const receivedCodeUpdateProvenanceRecords =
          successfulCodeTargets.length > 0
            ? ((await this.sourceProvenanceService?.recordReceivedCodeUpdates({
                projectId: currentProcess.projectId,
                processId: args.processId,
                codeTargets: successfulCodeTargets,
              })) ?? [])
            : [];

        await this.reconcileDeferredArchiveEntries({
          projectId: args.projectId,
          processId: args.processId,
          archiveEntries: args.deferredArchiveEntries,
          informedWorkProvenanceRecords: args.informedWorkProvenanceRecords,
          checkpointArtifactVersions,
          receivedCodeUpdateProvenanceRecords,
        });

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
            projectId: args.projectId,
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
          projectId: args.projectId,
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

      await this.reconcileDeferredArchiveEntries({
        projectId: args.projectId,
        processId: args.processId,
        archiveEntries: args.deferredArchiveEntries,
        informedWorkProvenanceRecords: args.informedWorkProvenanceRecords,
        checkpointArtifactVersions,
        receivedCodeUpdateProvenanceRecords: [],
      });

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
          projectId: args.projectId,
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
              projectId: args.projectId,
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
        state: mapProviderFailureState(error),
        environmentId: args.environmentId,
        blockedReason: failureReason,
        lastHydratedAt: existingEnvironment.lastHydratedAt,
        lastCheckpointAt: failedCheckpointResult.completedAt,
        lastCheckpointResult: failedCheckpointResult,
      });
      const checkpointFailedHistoryItem = await this.appendProcessEvent({
        projectId: args.projectId,
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
   * Bridges the spec'd `ExecutionResult` checkpoint candidates into the
   * `CheckpointPlanner`'s legacy `CheckpointCandidate` shape. The planner still
   * thinks in `{ artifacts: [{ contents }], codeDiffs: [{ diff }] }` — Chunk 2
   * reuses that planner unchanged and resolves provider-owned `contentsRef` /
   * `workspaceRef` values into actual content here, failing fast if the active
   * provider cannot materialize them.
   */
  private async buildLegacyCheckpointCandidate(args: {
    adapter: ProviderAdapter;
    environmentId: string;
    artifactCandidates: ArtifactCheckpointCandidate[];
    codeCandidates: CodeCheckpointCandidate[];
    sourceSummariesById: Map<string, SourceAttachmentSummary>;
  }): Promise<{ artifacts: CheckpointArtifact[]; codeDiffs: CodeDiff[] }> {
    const nowIso = new Date().toISOString();

    const artifacts: CheckpointArtifact[] = await Promise.all(
      args.artifactCandidates.map(async (candidate) => ({
        artifactId: candidate.artifactId,
        producedAt: nowIso,
        contents: await resolveCandidateContents({
          adapter: args.adapter,
          environmentId: args.environmentId,
          ref: candidate.contentsRef,
        }),
        targetLabel: candidate.displayName,
      })),
    );

    const codeDiffs: CodeDiff[] = await Promise.all(
      args.codeCandidates.map(async (candidate) => {
        const source = args.sourceSummariesById.get(candidate.sourceAttachmentId);
        if (source === undefined) {
          // A candidate for an unknown source attachment means the script
          // produced work against something the durable store no longer knows
          // about. Fail loud so the orchestrator catches this and records a
          // failed checkpoint result rather than silently dropping the work.
          throw new Error(
            `CodeCheckpointCandidate references sourceAttachmentId '${candidate.sourceAttachmentId}' that is not in the project's current source listing.`,
          );
        }
        return {
          sourceAttachmentId: candidate.sourceAttachmentId,
          repositoryUrl: source.repositoryUrl,
          targetRef: candidate.targetRef ?? undefined,
          filePath: candidate.filePath,
          diff: await resolveCandidateContents({
            adapter: args.adapter,
            environmentId: args.environmentId,
            ref: candidate.workspaceRef,
          }),
          commitMessage: candidate.commitMessage,
        };
      }),
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
    failureState?: ProviderFailureState;
  }): Promise<void> {
    try {
      const currentEnvironment = await this.platformStore.getProcessEnvironmentSummary({
        processId: args.processId,
      });
      const failedEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        state: args.failureState ?? 'failed',
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
        const failureState = mapProviderFailureState(args.error);
        const failed = await this.upsertEnvironmentState({
          processId: args.processId,
          state: failureState,
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
    failureState?: ProviderFailureState;
  }): Promise<void> {
    try {
      const failedEnvironment = await this.upsertEnvironmentState({
        processId: args.processId,
        state: args.failureState ?? 'failed',
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
    const [materialRefs, currentOutputs, currentProcess] = await Promise.all([
      this.platformStore.getCurrentProcessMaterialRefs({ processId }),
      this.platformStore.listProcessOutputs({ processId }),
      this.platformStore.getProcessRecord({ processId }),
    ]);
    const activeSourceAttachmentIds =
      currentProcess === null
        ? [...materialRefs.sourceAttachmentIds]
        : resolveActiveProcessSourceAttachments({
            sourceAttachments: await this.platformStore.listProjectSourceAttachments({
              projectId: currentProcess.projectId,
            }),
            processId,
            currentSourceAttachmentIds: materialRefs.sourceAttachmentIds,
          }).map((sourceAttachment) => sourceAttachment.sourceAttachmentId);

    return planHydrationWorkingSet({
      artifactIds: materialRefs.artifactIds,
      sourceAttachmentIds: activeSourceAttachmentIds,
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
   * `fingerprint` is the persisted `workingSetFingerprint` from the durable
   * env-state row. The adapter sees the same digest the stale-projection path
   * uses, rather than a placeholder or a recomputed server-local hash.
   */
  private async buildAdapterHydrationPlan(args: {
    projectId: string;
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<HydrationPlan> {
    const [artifacts, sources, outputs, fingerprint] = await Promise.all([
      this.platformStore.listProjectArtifacts({ projectId: args.projectId }),
      this.platformStore.listProjectSourceAttachments({ projectId: args.projectId }),
      this.platformStore.listProcessOutputs({ processId: args.processId }),
      this.platformStore.getProcessWorkingSetFingerprint({ processId: args.processId }),
    ]);

    const artifactById = new Map(artifacts.map((artifact) => [artifact.artifactId, artifact]));
    const sourceById = new Map(sources.map((source) => [source.sourceAttachmentId, source]));
    const outputById = new Map(outputs.map((output) => [output.outputId, output]));

    if (fingerprint === null) {
      throw new Error(
        `HydrationPlan is missing a persisted workingSetFingerprint for process '${args.processId}'.`,
      );
    }

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
          // A plan referencing a source we can't resolve against the current
          // project-scoped sources is a real breakage — fail loud rather than
          // fabricating a placeholder repositoryUrl that would silently bypass
          // hydration or checkpointing.
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

  private async appendProcessEvent(args: {
    projectId: string;
    processId: string;
    text: string;
  }): Promise<ProcessHistoryItem> {
    const historyItem = await this.platformStore.appendProcessHistoryItem({
      processId: args.processId,
      kind: 'process_event',
      lifecycleState: 'finalized',
      text: args.text,
      relatedSideWorkId: null,
      relatedArtifactId: null,
      clientRequestId: null,
    });

    await this.archiveFinalizationService.appendFromProcessHistoryItem({
      projectId: args.projectId,
      processId: args.processId,
      historyItem,
    });

    return historyItem;
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

function deriveUsedSourceAttachmentIds(executionResult: ExecutionResult): string[] {
  if (executionResult.usedSourceAttachmentIds !== undefined) {
    return Array.from(new Set(executionResult.usedSourceAttachmentIds));
  }

  return Array.from(
    new Set(
      executionResult.codeCheckpointCandidates.map((candidate) => candidate.sourceAttachmentId),
    ),
  );
}

function archiveEntryRequiresDeferredRelations(entry: RuntimeArchiveEntry): boolean {
  return entry.artifactCheckpointIndex != null || entry.sourceProvenanceBinding != null;
}

function buildDeferredArchiveDegradationReason(args: {
  archiveEntry: RuntimeArchiveEntry;
  artifactVersion: ArtifactVersionRecord | null;
  sourceProvenanceRecord: StoredSourceProvenanceRecord | null;
}): string | null {
  const degradationReasons =
    args.archiveEntry.degradationReason === null ||
    args.archiveEntry.degradationReason === undefined
      ? []
      : [args.archiveEntry.degradationReason];

  if (
    (args.archiveEntry.artifactCheckpointIndex ?? null) !== null &&
    args.artifactVersion === null
  ) {
    degradationReasons.push('Related artifact version is unavailable.');
  }

  if (
    args.archiveEntry.sourceProvenanceBinding !== undefined &&
    args.archiveEntry.sourceProvenanceBinding !== null &&
    args.sourceProvenanceRecord === null
  ) {
    degradationReasons.push('Related source provenance is unavailable.');
  }

  return [...new Set(degradationReasons)].join(' ') || null;
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
  adapter: ProviderAdapter;
  environmentId: string;
  ref: string;
}): Promise<string> {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(args.ref)) {
    // Non-filesystem URI scheme (mem://, data://, etc.) — test-fake territory.
    return args.ref;
  }

  return args.adapter.resolveCandidateContents({
    environmentId: args.environmentId,
    ref: args.ref,
  });
}

function mapProviderFailureState(error: unknown): ProviderFailureState {
  return error instanceof ProviderLifecycleError ? error.environmentState : 'failed';
}

import type {
  EnvironmentSummary,
  LastCheckpointResult,
  ProcessSummary,
  RebuildProcessResponse,
  RehydrateProcessResponse,
  SourceAttachmentSummary,
} from '../../../../shared/contracts/index.js';
import { AppError } from '../../../errors/app-error.js';
import { notImplementedErrorCode } from '../../../errors/codes.js';
import type { PlatformStore } from '../../projects/platform-store.js';
import type { ProcessLiveHub } from '../live/process-live-hub.js';
import { buildProcessSurfaceSummary } from '../process-work-surface.service.js';
import type { CheckpointPlanner } from './checkpoint-planner.js';
import type { CodeCheckpointTarget } from './checkpoint-types.js';
import type { CodeCheckpointWriter } from './code-checkpoint-writer.js';
import type { ProviderAdapter } from './provider-adapter.js';
import type { ScriptExecutionService } from './script-execution.service.js';

export class ProcessEnvironmentService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly providerAdapter: ProviderAdapter,
    private readonly processLiveHub: ProcessLiveHub,
    private readonly scriptExecutionService?: ScriptExecutionService,
    private readonly checkpointPlanner?: CheckpointPlanner,
    private readonly codeCheckpointWriter?: CodeCheckpointWriter,
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
   */
  runHydrationAsync(args: { projectId: string; processId: string }): void {
    void this.executeHydration(args);
  }

  async rehydrate(args: {
    actor: { userId: string };
    projectId: string;
    processId: string;
  }): Promise<RehydrateProcessResponse> {
    void args;

    throw new AppError({
      code: notImplementedErrorCode,
      message: 'Story 5 RED: rehydrate is not implemented yet.',
      statusCode: 501,
    });
  }

  async rebuild(args: {
    actor: { userId: string };
    projectId: string;
    processId: string;
  }): Promise<RebuildProcessResponse> {
    void args;

    throw new AppError({
      code: notImplementedErrorCode,
      message: 'Story 5 RED: rebuild is not implemented yet.',
      statusCode: 501,
    });
  }

  private async executeHydration(args: { projectId: string; processId: string }): Promise<void> {
    const [plan, existing] = await Promise.all([
      this.platformStore.getProcessHydrationPlan({ processId: args.processId }),
      this.platformStore.getProcessEnvironmentSummary({ processId: args.processId }),
    ]);

    const resolvedPlan = plan ?? { artifactIds: [], sourceAttachmentIds: [], outputIds: [] };

    let hydratedEnvironment: EnvironmentSummary | null = null;
    let hydrationError: string | null = null;

    try {
      const result = await this.providerAdapter.hydrateEnvironment({
        processId: args.processId,
        plan: resolvedPlan,
      });
      hydratedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'ready',
        environmentId: result.environmentId,
        blockedReason: null,
        lastHydratedAt: result.lastHydratedAt,
      });
    } catch (error) {
      hydrationError = error instanceof Error ? error.message : 'Unknown hydration error';
    }

    if (hydratedEnvironment !== null) {
      const transitionResult = await this.platformStore.transitionProcessToRunning({
        processId: args.processId,
      });
      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: transitionResult.process,
        environment: hydratedEnvironment,
      });

      try {
        this.runExecutionAsync({
          projectId: args.projectId,
          processId: args.processId,
          environmentId: hydratedEnvironment.environmentId,
        });
      } catch {
        // RED phase: keep the hydration success path legible while execution is still stubbed.
      }
    } else {
      const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'failed',
        environmentId: existing.environmentId,
        blockedReason: hydrationError,
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
      void this.executeExecution({
        ...args,
        environmentId,
        scriptExecutionService,
      });
    }, 0);
  }

  private async executeExecution(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    scriptExecutionService: ScriptExecutionService;
  }): Promise<void> {
    const currentProcess = await this.platformStore.getProcessRecord({
      processId: args.processId,
    });

    if (currentProcess === null) {
      return;
    }

    let lastHydratedAt: string | null = null;

    try {
      const existingEnvironment = await this.platformStore.getProcessEnvironmentSummary({
        processId: args.processId,
      });
      lastHydratedAt = existingEnvironment.lastHydratedAt;
      const runningEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
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
        processId: args.processId,
        environmentId: args.environmentId,
      });

      if (executionResult.outcome === 'failed') {
        const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
          processId: args.processId,
          providerKind: null,
          state: 'failed',
          environmentId: args.environmentId,
          blockedReason: executionResult.failureReason ?? 'Execution failed.',
          lastHydratedAt: runningEnvironment.lastHydratedAt,
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: failedEnvironment,
        });
        return;
      }

      const checkpointingEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'checkpointing',
        environmentId: args.environmentId,
        blockedReason: null,
        lastHydratedAt: runningEnvironment.lastHydratedAt,
      });
      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: currentProcess,
        environment: checkpointingEnvironment,
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
        });
      }
    } catch (error) {
      try {
        const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
          processId: args.processId,
          providerKind: null,
          state: 'failed',
          environmentId: args.environmentId,
          blockedReason: error instanceof Error ? error.message : 'Unknown execution error',
          lastHydratedAt,
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: failedEnvironment,
        });
      } catch {
        // Execution failures must not escape the fire-and-forget path.
      }
    }
  }

  private runCheckpointAsync(args: {
    projectId: string;
    processId: string;
    environmentId: string;
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
      });
    }, 0);
  }

  private async executeCheckpoint(args: {
    projectId: string;
    processId: string;
    environmentId: string;
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
      const candidate = await this.providerAdapter.collectCheckpointCandidate({
        processId: args.processId,
        environmentId: args.environmentId,
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

        const artifactEnvironment = await this.platformStore.upsertProcessEnvironmentState({
          processId: args.processId,
          providerKind: null,
          state: 'checkpointing',
          environmentId: args.environmentId,
          blockedReason: null,
          lastHydratedAt: existingEnvironment.lastHydratedAt,
          lastCheckpointAt: artifactCheckpointResult.completedAt,
          lastCheckpointResult: artifactCheckpointResult,
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: artifactEnvironment,
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
          const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
            processId: args.processId,
            providerKind: null,
            state: 'failed',
            environmentId: args.environmentId,
            blockedReason: failedCodeResult.failureReason,
            lastHydratedAt: existingEnvironment.lastHydratedAt,
            lastCheckpointAt: failedCodeResult.completedAt,
            lastCheckpointResult: failedCodeResult,
          });
          this.publishEnvironmentUpsert({
            projectId: args.projectId,
            processId: args.processId,
            process: currentProcess,
            environment: failedEnvironment,
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
        const readyEnvironment = await this.platformStore.upsertProcessEnvironmentState({
          processId: args.processId,
          providerKind: null,
          state: 'ready',
          environmentId: args.environmentId,
          blockedReason: null,
          lastHydratedAt: existingEnvironment.lastHydratedAt,
          lastCheckpointAt: finalCheckpointResult.completedAt,
          lastCheckpointResult: finalCheckpointResult,
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: readyEnvironment,
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
        const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
          processId: args.processId,
          providerKind: null,
          state: 'failed',
          environmentId: args.environmentId,
          blockedReason: failedReadOnlyResult.failureReason,
          lastHydratedAt: existingEnvironment.lastHydratedAt,
          lastCheckpointAt: failedReadOnlyResult.completedAt,
          lastCheckpointResult: failedReadOnlyResult,
        });
        this.publishEnvironmentUpsert({
          projectId: args.projectId,
          processId: args.processId,
          process: currentProcess,
          environment: failedEnvironment,
        });
        return;
      }

      const readyEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'ready',
        environmentId: args.environmentId,
        blockedReason: null,
        lastHydratedAt: existingEnvironment.lastHydratedAt,
        lastCheckpointAt: artifactCheckpointResult?.completedAt,
        lastCheckpointResult: artifactCheckpointResult ?? undefined,
      });
      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: currentProcess,
        environment: readyEnvironment,
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
      const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'failed',
        environmentId: args.environmentId,
        blockedReason: failureReason,
        lastHydratedAt: existingEnvironment.lastHydratedAt,
        lastCheckpointAt: failedCheckpointResult.completedAt,
        lastCheckpointResult: failedCheckpointResult,
      });
      this.publishEnvironmentUpsert({
        projectId: args.projectId,
        processId: args.processId,
        process: currentProcess,
        environment: failedEnvironment,
      });
    }
  }

  private publishEnvironmentUpsert(args: {
    projectId: string;
    processId: string;
    process: ProcessSummary | null;
    environment: EnvironmentSummary;
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
        environment: args.environment,
      },
    });
  }
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

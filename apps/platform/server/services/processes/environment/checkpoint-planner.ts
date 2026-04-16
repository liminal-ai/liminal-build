import type { SourceAccessMode } from '../../../../shared/contracts/index.js';
import type { CheckpointCandidate, CheckpointPlan } from './checkpoint-types.js';

export class CheckpointPlanner {
  async planFor(args: {
    processId: string;
    candidate: CheckpointCandidate;
    sourceAccessModes: Record<string, SourceAccessMode>;
  }): Promise<CheckpointPlan> {
    void args.processId;

    const artifactTargets = [...(args.candidate.artifacts ?? [])];
    const codeTargets = [];
    const skippedReadOnly: CheckpointPlan['skippedReadOnly'] = [];

    for (const codeDiff of args.candidate.codeDiffs ?? []) {
      const accessMode = args.sourceAccessModes[codeDiff.sourceAttachmentId] ?? 'read_only';

      if (accessMode !== 'read_write') {
        skippedReadOnly.push({
          sourceAttachmentId: codeDiff.sourceAttachmentId,
          accessMode,
        });
        continue;
      }

      codeTargets.push({
        sourceAttachmentId: codeDiff.sourceAttachmentId,
        repositoryUrl: codeDiff.repositoryUrl,
        targetRef: codeDiff.targetRef ?? null,
        filePath: codeDiff.filePath,
        diff: codeDiff.diff,
        commitMessage: codeDiff.commitMessage,
      });
    }

    return {
      artifactTargets,
      codeTargets,
      skippedReadOnly,
    };
  }
}

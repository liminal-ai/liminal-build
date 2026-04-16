import type { SourceAccessMode } from '../../../../shared/contracts/index.js';
import type { CheckpointCandidate, CheckpointPlan } from './checkpoint-types.js';

export class CheckpointPlanner {
  async planFor(args: {
    processId: string;
    candidate: CheckpointCandidate;
    sourceAccessModes: Record<string, SourceAccessMode>;
  }): Promise<CheckpointPlan> {
    void args;
    throw new Error('NOT_IMPLEMENTED: CheckpointPlanner.planFor');
  }
}

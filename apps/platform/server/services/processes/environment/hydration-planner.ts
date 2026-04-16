import type { CurrentProcessMaterialRefs, WorkingSetPlan } from '../../projects/platform-store.js';

export interface HydrationWorkingSetInput extends CurrentProcessMaterialRefs {
  outputIds: string[];
}

/**
 * Derives a hydration working-set plan from the process's current material refs
 * and current output ids. Categories with no entries are preserved as empty
 * arrays so callers can distinguish "no items" from "items not yet resolved".
 */
export function planHydrationWorkingSet(input: HydrationWorkingSetInput): WorkingSetPlan {
  return {
    artifactIds: [...input.artifactIds],
    sourceAttachmentIds: [...input.sourceAttachmentIds],
    outputIds: [...input.outputIds],
  };
}

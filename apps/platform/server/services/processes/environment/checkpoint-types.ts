import type { SourceAccessMode } from '../../../../shared/contracts/index.js';

export type CheckpointArtifact = {
  artifactId?: string;
  producedAt: string;
  contents: string;
  targetLabel: string;
};

export type CodeDiff = {
  sourceAttachmentId: string;
  targetRef?: string;
  diff: string;
};

export type CheckpointCandidate = {
  artifacts?: CheckpointArtifact[];
  codeDiffs?: CodeDiff[];
};

export type ArtifactCheckpointTarget = CheckpointArtifact;

export type CodeCheckpointTarget = {
  sourceAttachmentId: string;
  targetRef: string | null;
  diff: string;
};

export type CheckpointPlan = {
  artifactTargets: ArtifactCheckpointTarget[];
  codeTargets: CodeCheckpointTarget[];
  skippedReadOnly: Array<{
    sourceAttachmentId: string;
    accessMode: SourceAccessMode;
  }>;
};

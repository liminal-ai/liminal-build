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
  repositoryUrl: string;
  filePath: string;
  diff: string;
  commitMessage: string;
};

export type CheckpointCandidate = {
  artifacts?: CheckpointArtifact[];
  codeDiffs?: CodeDiff[];
};

export type ArtifactCheckpointTarget = CheckpointArtifact;

export type CodeCheckpointTarget = {
  sourceAttachmentId: string;
  repositoryUrl: string;
  targetRef: string | null;
  filePath: string;
  diff: string;
  commitMessage: string;
};

export type CheckpointPlan = {
  artifactTargets: ArtifactCheckpointTarget[];
  codeTargets: CodeCheckpointTarget[];
  skippedReadOnly: Array<{
    sourceAttachmentId: string;
    accessMode: SourceAccessMode;
  }>;
};

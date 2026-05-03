import type { ReviewTargetSummary } from '../../../shared/contracts/index.js';

type ReviewTargetCandidate = {
  publishedAt: string;
  targetKind: 'artifact' | 'package';
  targetId: string;
  displayName: string;
};

export function buildReviewTargetSummaries(
  candidates: ReviewTargetCandidate[],
): ReviewTargetSummary[] {
  return [...candidates]
    .sort((left, right) => {
      const publishedAtComparison = right.publishedAt.localeCompare(left.publishedAt);

      if (publishedAtComparison !== 0) {
        return publishedAtComparison;
      }

      if (left.targetKind === right.targetKind) {
        return left.displayName.localeCompare(right.displayName);
      }

      return left.targetKind === 'artifact' ? -1 : 1;
    })
    .map((candidate, position) => ({
      position,
      targetKind: candidate.targetKind,
      targetId: candidate.targetId,
      displayName: candidate.displayName,
    }));
}

export function includesArtifactInReviewContext(args: {
  artifactId: string;
  currentArtifactIds: string[];
  packageContextArtifactIds: string[];
}): boolean {
  return (
    args.currentArtifactIds.includes(args.artifactId) ||
    args.packageContextArtifactIds.includes(args.artifactId)
  );
}

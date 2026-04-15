import {
  type ArtifactSummary,
  type ProcessArtifactReference,
  type ProcessMaterialsSectionEnvelope,
  type ProcessOutputReference,
  type ProcessSourceReference,
  processMaterialsSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type {
  CurrentProcessMaterialRefs,
  PlatformProcessOutputSummary,
  PlatformStore,
} from '../../projects/platform-store.js';

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function buildCurrentArtifacts(args: {
  artifacts: ArtifactSummary[];
  currentMaterialRefs: CurrentProcessMaterialRefs;
  processId: string;
}): ProcessArtifactReference[] {
  const currentArtifactIds = new Set(args.currentMaterialRefs.artifactIds);

  return sortByUpdatedAtDesc(
    args.artifacts.filter((artifact) => currentArtifactIds.has(artifact.artifactId)),
  ).map((artifact) => ({
    artifactId: artifact.artifactId,
    displayName: artifact.displayName,
    currentVersionLabel: artifact.currentVersionLabel,
    roleLabel: resolveArtifactRoleLabel(artifact, args.processId),
    updatedAt: artifact.updatedAt,
  }));
}

function resolveArtifactRoleLabel(artifact: ArtifactSummary, processId: string): string | null {
  if (artifact.attachmentScope === 'project') {
    return 'Current shared artifact';
  }

  if (artifact.processId === processId) {
    return 'Current working artifact';
  }

  return 'Current referenced artifact';
}

function buildCurrentOutputs(args: {
  outputs: PlatformProcessOutputSummary[];
  currentArtifacts: ProcessArtifactReference[];
}): ProcessOutputReference[] {
  const currentArtifactIds = new Set(args.currentArtifacts.map((artifact) => artifact.artifactId));

  return sortByUpdatedAtDesc(args.outputs)
    .filter((output) => {
      if (output.state !== 'published_to_artifact') {
        return true;
      }

      if (output.linkedArtifactId === null) {
        return true;
      }

      return !currentArtifactIds.has(output.linkedArtifactId);
    })
    .map((output) => ({
      outputId: output.outputId,
      displayName: output.displayName,
      revisionLabel: output.revisionLabel,
      state: output.state,
      updatedAt: output.updatedAt,
    }));
}

function buildCurrentSources(args: {
  sourceAttachments: Awaited<ReturnType<PlatformStore['listProjectSourceAttachments']>>;
  currentMaterialRefs: CurrentProcessMaterialRefs;
}): ProcessSourceReference[] {
  const currentSourceAttachmentIds = new Set(args.currentMaterialRefs.sourceAttachmentIds);

  return sortByUpdatedAtDesc(
    args.sourceAttachments.filter((sourceAttachment) =>
      currentSourceAttachmentIds.has(sourceAttachment.sourceAttachmentId),
    ),
  ).map((sourceAttachment) => ({
    sourceAttachmentId: sourceAttachment.sourceAttachmentId,
    displayName: sourceAttachment.displayName,
    purpose: sourceAttachment.purpose,
    accessMode: sourceAttachment.accessMode,
    targetRef: sourceAttachment.targetRef,
    hydrationState: sourceAttachment.hydrationState,
    updatedAt: sourceAttachment.updatedAt,
  }));
}

export class MaterialsSectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: {
    projectId: string;
    processId: string;
  }): Promise<ProcessMaterialsSectionEnvelope> {
    const [artifacts, outputs, sourceAttachments, currentMaterialRefs] = await Promise.all([
      this.platformStore.listProjectArtifacts({
        projectId: args.projectId,
      }),
      this.platformStore.listProcessOutputs({
        processId: args.processId,
      }),
      this.platformStore.listProjectSourceAttachments({
        projectId: args.projectId,
      }),
      this.platformStore.getCurrentProcessMaterialRefs({
        processId: args.processId,
      }),
    ]);

    const currentArtifacts = buildCurrentArtifacts({
      artifacts,
      currentMaterialRefs,
      processId: args.processId,
    });
    const currentOutputs = buildCurrentOutputs({
      outputs,
      currentArtifacts,
    });
    const currentSources = buildCurrentSources({
      sourceAttachments,
      currentMaterialRefs,
    });

    return processMaterialsSectionEnvelopeSchema.parse({
      status:
        currentArtifacts.length > 0 || currentOutputs.length > 0 || currentSources.length > 0
          ? 'ready'
          : 'empty',
      currentArtifacts,
      currentOutputs,
      currentSources,
    });
  }
}

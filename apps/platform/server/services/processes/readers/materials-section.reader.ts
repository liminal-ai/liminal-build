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

async function buildCurrentArtifacts(args: {
  platformStore: PlatformStore;
  artifacts: ArtifactSummary[];
  currentMaterialRefs: CurrentProcessMaterialRefs;
  processId: string;
}): Promise<ProcessArtifactReference[]> {
  const currentArtifactIds = new Set(args.currentMaterialRefs.artifactIds);
  const currentArtifacts = sortByUpdatedAtDesc(
    args.artifacts.filter((artifact) => currentArtifactIds.has(artifact.artifactId)),
  );
  const roleLabelsByArtifactId = new Map(
    await Promise.all(
      currentArtifacts.map(async (artifact) => {
        const versions = await args.platformStore.listArtifactVersions({
          artifactId: artifact.artifactId,
        });
        const roleLabel = versions.some((version) => version.createdByProcessId === args.processId)
          ? 'Current working artifact'
          : 'Current referenced artifact';

        return [artifact.artifactId, roleLabel] as const;
      }),
    ),
  );

  return currentArtifacts.map((artifact) => ({
    artifactId: artifact.artifactId,
    displayName: artifact.displayName,
    currentVersionLabel: artifact.currentVersionLabel,
    roleLabel: roleLabelsByArtifactId.get(artifact.artifactId) ?? 'Current referenced artifact',
    updatedAt: artifact.updatedAt,
  }));
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
    repositoryUrl: sourceAttachment.repositoryUrl,
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

    const currentArtifacts = await buildCurrentArtifacts({
      platformStore: this.platformStore,
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

import {
  type ProcessMaterialsSectionEnvelope,
  processMaterialsSectionEnvelopeSchema,
} from '../../../../shared/contracts/index.js';
import type { PlatformStore } from '../../projects/platform-store.js';

export class MaterialsSectionReader {
  constructor(private readonly platformStore: PlatformStore) {}

  async read(args: {
    projectId: string;
    processId: string;
  }): Promise<ProcessMaterialsSectionEnvelope> {
    const [artifacts, outputs, sourceAttachments] = await Promise.all([
      this.platformStore.listProjectArtifacts({
        projectId: args.projectId,
      }),
      this.platformStore.listProcessOutputs({
        processId: args.processId,
      }),
      this.platformStore.listProjectSourceAttachments({
        projectId: args.projectId,
      }),
    ]);

    const currentArtifacts = artifacts
      .filter((artifact) => artifact.processId === args.processId)
      .map((artifact) => ({
        artifactId: artifact.artifactId,
        displayName: artifact.displayName,
        currentVersionLabel: artifact.currentVersionLabel,
        roleLabel: artifact.attachmentScope === 'process' ? 'Current working artifact' : null,
        updatedAt: artifact.updatedAt,
      }));

    const currentSources = sourceAttachments
      .filter((sourceAttachment) => sourceAttachment.processId === args.processId)
      .map((sourceAttachment) => ({
        sourceAttachmentId: sourceAttachment.sourceAttachmentId,
        displayName: sourceAttachment.displayName,
        purpose: sourceAttachment.purpose,
        targetRef: sourceAttachment.targetRef,
        hydrationState: sourceAttachment.hydrationState,
        updatedAt: sourceAttachment.updatedAt,
      }));

    return processMaterialsSectionEnvelopeSchema.parse({
      status:
        currentArtifacts.length > 0 || outputs.length > 0 || currentSources.length > 0
          ? 'ready'
          : 'empty',
      currentArtifacts,
      currentOutputs: outputs,
      currentSources,
    });
  }
}

import { describe, expect, it } from 'vitest';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  artifactSummarySchema,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';

const project = projectSummarySchema.parse({
  projectId: 'project-checkpoint-store-001',
  name: 'Checkpoint Store Project',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 1,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-15T12:00:00.000Z',
});

const process = processSummarySchema.parse({
  processId: 'process-checkpoint-store-001',
  displayLabel: 'Checkpoint Store Process',
  processType: 'FeatureSpecification',
  status: 'running',
  phaseLabel: 'Working',
  nextActionLabel: 'Monitor progress in the work surface',
  availableActions: ['open', 'review'],
  hasEnvironment: true,
  updatedAt: '2026-04-15T12:00:00.000Z',
});

const existingArtifact = artifactSummarySchema.parse({
  artifactId: 'artifact-checkpoint-store-existing-001',
  displayName: 'Existing Artifact',
  currentVersionLabel: 'checkpoint-20260415110000',
  updatedAt: '2026-04-15T11:00:00.000Z',
});

function buildStore() {
  return new InMemoryPlatformStore({
    projectAccessByProjectId: {
      [project.projectId]: {
        kind: 'accessible',
        project,
      },
    },
    processesByProjectId: {
      [project.projectId]: [process],
    },
    artifactsByProjectId: {
      [project.projectId]: [existingArtifact],
    },
    currentMaterialRefsByProcessId: {
      [process.processId]: {
        artifactIds: [],
        sourceAttachmentIds: [],
      },
    },
  });
}

describe('InMemoryPlatformStore checkpoint artifact persistence', () => {
  it('creates a new artifact when artifactId is omitted', async () => {
    const store = buildStore();

    const outputs = await store.persistCheckpointArtifacts({
      processId: process.processId,
      artifacts: [
        {
          producedAt: '2026-04-15T12:30:00.000Z',
          contents: '# New Checkpoint',
          targetLabel: 'New Checkpoint Artifact',
        },
      ],
    });

    const generatedArtifactId = `${process.processId}:checkpoint-artifact-2`;

    expect(outputs).toMatchObject([
      {
        linkedArtifactId: generatedArtifactId,
        displayName: 'New Checkpoint Artifact',
        state: 'published_to_artifact',
      },
    ]);
    await expect(store.getArtifactContent({ artifactId: generatedArtifactId })).resolves.toBe(
      '# New Checkpoint',
    );
    await expect(
      store.listArtifactVersions({ artifactId: generatedArtifactId }),
    ).resolves.toHaveLength(1);
  });

  it('validates the whole batch before mutating checkpoint artifacts', async () => {
    const store = buildStore();
    const generatedArtifactId = `${process.processId}:checkpoint-artifact-2`;
    const beforeArtifacts = await store.listProjectArtifacts({ projectId: project.projectId });

    await expect(
      store.persistCheckpointArtifacts({
        processId: process.processId,
        artifacts: [
          {
            producedAt: '2026-04-15T12:31:00.000Z',
            contents: '# Should Not Persist',
            targetLabel: 'Should Not Persist',
          },
          {
            artifactId: 'artifact-checkpoint-store-missing-001',
            producedAt: '2026-04-15T12:32:00.000Z',
            contents: '# Missing Target',
            targetLabel: 'Missing Target',
          },
        ],
      }),
    ).rejects.toThrow(
      "Artifact checkpoint target 'artifact-checkpoint-store-missing-001' was not found in this process project.",
    );

    await expect(store.getArtifactContent({ artifactId: generatedArtifactId })).resolves.toBeNull();
    await expect(store.listArtifactVersions({ artifactId: generatedArtifactId })).resolves.toEqual(
      [],
    );
    await expect(store.listProjectArtifacts({ projectId: project.projectId })).resolves.toEqual(
      beforeArtifacts,
    );
    await expect(store.listProcessOutputs({ processId: process.processId })).resolves.toEqual([]);
  });
});

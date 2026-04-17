import { describe, expect, it } from 'vitest';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { readyEnvironmentFixture } from '../../fixtures/process-environment.js';

describe('InMemoryPlatformStore environment summary parity', () => {
  it('projects ready as stale when canonical inputs diverge from the stored fingerprint', async () => {
    const project = projectSummarySchema.parse({
      projectId: 'project-stale-001',
      name: 'Fingerprint Parity',
      ownerDisplayName: 'Lee Moore',
      role: 'owner',
      processCount: 1,
      artifactCount: 2,
      sourceAttachmentCount: 0,
      lastUpdatedAt: '2026-04-16T12:00:00.000Z',
    });
    const process = processSummarySchema.parse({
      processId: 'process-stale-001',
      displayLabel: 'Feature Specification #1',
      processType: 'FeatureSpecification',
      status: 'running',
      phaseLabel: 'Working',
      nextActionLabel: 'Monitor progress in the work surface',
      availableActions: ['review'],
      hasEnvironment: true,
      updatedAt: '2026-04-16T12:00:00.000Z',
    });
    const store = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [project],
      },
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
        [project.projectId]: [
          {
            artifactId: 'artifact-stale-001',
            displayName: 'Spec Draft',
            currentVersionLabel: 'v1',
            attachmentScope: 'process',
            processId: process.processId,
            processDisplayLabel: process.displayLabel,
            updatedAt: '2026-04-16T12:00:00.000Z',
          },
          {
            artifactId: 'artifact-stale-002',
            displayName: 'Spec Draft v2',
            currentVersionLabel: 'v2',
            attachmentScope: 'process',
            processId: process.processId,
            processDisplayLabel: process.displayLabel,
            updatedAt: '2026-04-16T12:01:00.000Z',
          },
        ],
      },
      currentMaterialRefsByProcessId: {
        [process.processId]: {
          artifactIds: ['artifact-stale-001'],
          sourceAttachmentIds: [],
        },
      },
      processEnvironmentSummariesByProcessId: {
        [process.processId]: readyEnvironmentFixture,
      },
      processEnvironmentProviderKindsByProcessId: {
        [process.processId]: 'local',
      },
    });

    const storedFingerprint = await store.getProcessWorkingSetFingerprint({
      processId: process.processId,
    });

    await store.setCurrentProcessMaterialRefs({
      processId: process.processId,
      artifactIds: ['artifact-stale-002'],
      sourceAttachmentIds: [],
    });

    const summary = await store.getProcessEnvironmentSummary({
      processId: process.processId,
    });

    expect(storedFingerprint).not.toBeNull();
    expect(summary.state).toBe('stale');
    expect(summary.statusLabel).toBe('Environment is stale');
  });

  it('keeps ready state when the canonical fingerprint still matches', async () => {
    const process = processSummarySchema.parse({
      processId: 'process-ready-001',
      displayLabel: 'Feature Specification #1',
      processType: 'FeatureSpecification',
      status: 'running',
      phaseLabel: 'Working',
      nextActionLabel: 'Monitor progress in the work surface',
      availableActions: ['review'],
      hasEnvironment: true,
      updatedAt: '2026-04-16T12:00:00.000Z',
    });
    const store = new InMemoryPlatformStore({
      processesByProjectId: {
        'project-ready-001': [process],
      },
      artifactsByProjectId: {
        'project-ready-001': [
          {
            artifactId: 'artifact-ready-001',
            displayName: 'Spec Draft',
            currentVersionLabel: 'v1',
            attachmentScope: 'process',
            processId: process.processId,
            processDisplayLabel: process.displayLabel,
            updatedAt: '2026-04-16T12:00:00.000Z',
          },
        ],
      },
      currentMaterialRefsByProcessId: {
        [process.processId]: {
          artifactIds: ['artifact-ready-001'],
          sourceAttachmentIds: [],
        },
      },
      processEnvironmentSummariesByProcessId: {
        [process.processId]: readyEnvironmentFixture,
      },
      processEnvironmentProviderKindsByProcessId: {
        [process.processId]: 'local',
      },
    });

    await expect(
      store.getProcessEnvironmentSummary({ processId: process.processId }),
    ).resolves.toMatchObject({
      state: 'ready',
      statusLabel: 'Ready for work',
    });
  });
});

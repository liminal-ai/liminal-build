import { describe, expect, it } from 'vitest';
import {
  InMemoryPlatformStore,
  NullPlatformStore,
} from '../../../apps/platform/server/services/projects/platform-store.js';

describe('hasCanonicalRecoveryMaterials parity', () => {
  it('NullPlatformStore returns false because it has no durable recovery materials', async () => {
    const store = new NullPlatformStore();

    await expect(store.hasCanonicalRecoveryMaterials({ processId: 'process-null' })).resolves.toBe(
      false,
    );
  });

  it('returns false when no materials, no outputs, and no sources are seeded', async () => {
    const store = new InMemoryPlatformStore();

    await expect(store.hasCanonicalRecoveryMaterials({ processId: 'process-empty' })).resolves.toBe(
      false,
    );
  });

  it('returns false when seeded with empty arrays for refs and outputs', async () => {
    const store = new InMemoryPlatformStore({
      currentMaterialRefsByProcessId: {
        'process-empty-arrays': {
          artifactIds: [],
          sourceAttachmentIds: [],
        },
      },
      processOutputsByProcessId: {
        'process-empty-arrays': [],
      },
    });

    await expect(
      store.hasCanonicalRecoveryMaterials({ processId: 'process-empty-arrays' }),
    ).resolves.toBe(false);
  });

  it('returns true when at least one current artifact id exists', async () => {
    const store = new InMemoryPlatformStore({
      currentMaterialRefsByProcessId: {
        'process-with-artifact': {
          artifactIds: ['artifact-recovery-1'],
          sourceAttachmentIds: [],
        },
      },
    });

    await expect(
      store.hasCanonicalRecoveryMaterials({ processId: 'process-with-artifact' }),
    ).resolves.toBe(true);
  });

  it('returns true when at least one source attachment id exists', async () => {
    const store = new InMemoryPlatformStore({
      currentMaterialRefsByProcessId: {
        'process-with-source': {
          artifactIds: [],
          sourceAttachmentIds: ['source-recovery-1'],
        },
      },
    });

    await expect(
      store.hasCanonicalRecoveryMaterials({ processId: 'process-with-source' }),
    ).resolves.toBe(true);
  });

  it('returns true when at least one process output exists (no artifact refs)', async () => {
    const store = new InMemoryPlatformStore({
      currentMaterialRefsByProcessId: {
        'process-with-output': {
          artifactIds: [],
          sourceAttachmentIds: [],
        },
      },
      processOutputsByProcessId: {
        'process-with-output': [
          {
            outputId: 'output-recovery-1',
            linkedArtifactId: null,
            displayName: 'Recovery Output',
            revisionLabel: null,
            state: 'in_progress',
            updatedAt: '2026-04-15T12:00:00.000Z',
          },
        ],
      },
    });

    await expect(
      store.hasCanonicalRecoveryMaterials({ processId: 'process-with-output' }),
    ).resolves.toBe(true);
  });
});

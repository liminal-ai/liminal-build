import { describe, expect, it } from 'vitest';
import {
  FailingCodeCheckpointWriter,
  StubCodeCheckpointWriter,
} from '../../../apps/platform/server/services/processes/environment/code-checkpoint-writer.js';

describe('code checkpoint writer test seams', () => {
  it('StubCodeCheckpointWriter resolves a successful outcome for any candidate', async () => {
    const writer = new StubCodeCheckpointWriter();

    await expect(
      writer.writeFor({
        sourceAttachmentId: 'source-writable-001',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        targetRef: 'feature/story-4',
        filePath: 'docs/test.md',
        diff: 'diff content here',
        commitMessage: 'Test commit',
      }),
    ).resolves.toEqual({
      outcome: 'succeeded',
    });
  });

  it('FailingCodeCheckpointWriter returns a failed outcome with failureReason', async () => {
    const writer = new FailingCodeCheckpointWriter();

    await expect(
      writer.writeFor({
        sourceAttachmentId: 'source-writable-002',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        targetRef: 'main',
        filePath: 'README.md',
        diff: 'diff content here',
        commitMessage: 'Test commit',
      }),
    ).resolves.toEqual({
      outcome: 'failed',
      failureReason: expect.any(String),
    });
  });
});

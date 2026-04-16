import { describe, expect, it } from 'vitest';
import {
  FailingCodeCheckpointWriter,
  StubCodeCheckpointWriter,
} from '../../../apps/platform/server/services/processes/environment/code-checkpoint-writer.js';

describe('code checkpoint writer', () => {
  it('resolves a successful code checkpoint write for writable sources', async () => {
    const writer = new StubCodeCheckpointWriter();

    await expect(
      writer.writeFor({
        sourceAttachmentId: 'source-writable-001',
        targetRef: 'feature/story-4',
        diff: 'diff --git a/src/file.ts b/src/file.ts',
      }),
    ).resolves.toEqual({
      outcome: 'succeeded',
    });
  });

  it('returns a failed outcome with failureReason when canonical code persistence fails', async () => {
    const writer = new FailingCodeCheckpointWriter();

    await expect(
      writer.writeFor({
        sourceAttachmentId: 'source-writable-002',
        targetRef: 'main',
        diff: 'diff --git a/README.md b/README.md',
      }),
    ).resolves.toEqual({
      outcome: 'failed',
      failureReason: expect.any(String),
    });
  });
});

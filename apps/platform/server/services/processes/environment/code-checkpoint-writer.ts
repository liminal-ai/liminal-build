export interface CodeCheckpointWriter {
  writeFor(args: { sourceAttachmentId: string; targetRef: string | null; diff: string }): Promise<{
    outcome: 'succeeded' | 'failed';
    failureReason?: string;
  }>;
}

export class StubCodeCheckpointWriter implements CodeCheckpointWriter {
  async writeFor(_args: {
    sourceAttachmentId: string;
    targetRef: string | null;
    diff: string;
  }): Promise<{
    outcome: 'succeeded' | 'failed';
    failureReason?: string;
  }> {
    throw new Error('NOT_IMPLEMENTED: StubCodeCheckpointWriter.writeFor');
  }
}

export class FailingCodeCheckpointWriter implements CodeCheckpointWriter {
  async writeFor(_args: {
    sourceAttachmentId: string;
    targetRef: string | null;
    diff: string;
  }): Promise<{
    outcome: 'succeeded' | 'failed';
    failureReason?: string;
  }> {
    throw new Error('NOT_IMPLEMENTED: FailingCodeCheckpointWriter.writeFor');
  }
}

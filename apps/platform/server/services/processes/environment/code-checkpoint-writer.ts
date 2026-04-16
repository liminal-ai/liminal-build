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
    return {
      outcome: 'succeeded',
    };
  }
}

export class FailingCodeCheckpointWriter implements CodeCheckpointWriter {
  constructor(private readonly reason: string = 'Code checkpoint failed.') {}

  async writeFor(_args: {
    sourceAttachmentId: string;
    targetRef: string | null;
    diff: string;
  }): Promise<{
    outcome: 'succeeded' | 'failed';
    failureReason?: string;
  }> {
    return {
      outcome: 'failed',
      failureReason: this.reason,
    };
  }
}

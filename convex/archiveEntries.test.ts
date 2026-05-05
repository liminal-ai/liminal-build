import { describe, expect, it } from 'vitest';
import { appendArchiveEntry, listArchiveEntries } from './archiveEntries.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const appendArchiveEntryHandler = getHandler<
  {
    projectId: string;
    processId: string;
    entryKind:
      | 'user_message'
      | 'model_message'
      | 'reasoning'
      | 'script_emission'
      | 'tool_call'
      | 'tool_result'
      | 'process_event';
    finalizationKey: string;
    sourceObjectId?: string | null;
    bodyText?: string | null;
    bodyData?: { jsonText: string } | null;
    bodyFormat: 'plain_text' | 'markdown' | 'structured' | 'none';
    relatedArtifactVersionId?: string | null;
    relatedSourceProvenanceId?: string | null;
    relatedToolCallId?: string | null;
    entryStatus?: 'ready' | 'degraded';
    degradationReason?: string | null;
    recordedAt?: string;
  },
  {
    archiveEntryId: string;
    projectId: string;
    processId: string;
    entryKind:
      | 'user_message'
      | 'model_message'
      | 'reasoning'
      | 'script_emission'
      | 'tool_call'
      | 'tool_result'
      | 'process_event';
    sequence: number;
    lifecycleState: 'finalized';
    finalizationKey: string;
    sourceObjectId: string | null;
    bodyText: string | null;
    bodyData: { jsonText: string } | null;
    bodyFormat: 'plain_text' | 'markdown' | 'structured' | 'none';
    relatedArtifactVersionId: string | null;
    relatedSourceProvenanceId: string | null;
    relatedToolCallId: string | null;
    entryStatus: 'ready' | 'degraded';
    degradationReason: string | null;
    recordedAt: string;
  }
>(appendArchiveEntry);

const listArchiveEntriesHandler = getHandler<
  {
    processId: string;
    cursor?: string | null;
    limit: number;
  },
  {
    entries: Array<{
      archiveEntryId: string;
      projectId: string;
      processId: string;
      entryKind:
        | 'user_message'
        | 'model_message'
        | 'reasoning'
        | 'script_emission'
        | 'tool_call'
        | 'tool_result'
        | 'process_event';
      sequence: number;
      lifecycleState: 'finalized';
      finalizationKey: string;
      sourceObjectId: string | null;
      bodyText: string | null;
      bodyData: { jsonText: string } | null;
      bodyFormat: 'plain_text' | 'markdown' | 'structured' | 'none';
      relatedArtifactVersionId: string | null;
      relatedSourceProvenanceId: string | null;
      relatedToolCallId: string | null;
      entryStatus: 'ready' | 'degraded';
      degradationReason: string | null;
      recordedAt: string;
    }>;
    page: {
      cursor: string | null;
      nextCursor: string | null;
      hasMore: boolean;
    };
  }
>(listArchiveEntries);

function buildArchiveSeed() {
  return {
    projects: [
      {
        _id: 'project-archive-1',
        _creationTime: 1,
        name: 'Archive Project',
        ownerUserId: 'user-1',
        processCount: 2,
        artifactCount: 1,
        sourceAttachmentCount: 0,
        lastUpdatedAt: '2026-05-01T10:00:00.000Z',
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: 'process-archive-1',
        _creationTime: 2,
        projectId: 'project-archive-1',
        processType: 'FeatureImplementation',
        displayLabel: 'Archive Process One',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Inspect the archive',
        currentRequestHistoryItemId: null,
        hasEnvironment: true,
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
      {
        _id: 'process-archive-2',
        _creationTime: 3,
        projectId: 'project-archive-1',
        processType: 'FeatureImplementation',
        displayLabel: 'Archive Process Two',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Inspect the archive',
        currentRequestHistoryItemId: null,
        hasEnvironment: true,
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
    ],
    artifactVersions: [
      {
        _id: 'artifact-version-1',
        _creationTime: 4,
        artifactId: 'artifact-1',
        versionLabel: 'v1',
        contentStorageId: 'storage-1',
        contentKind: 'markdown',
        bytes: 128,
        createdAt: '2026-05-01T10:00:00.000Z',
        createdByProcessId: 'process-archive-1',
      },
    ],
  };
}

function buildAppendArgs(
  overrides: Partial<Parameters<typeof appendArchiveEntryHandler>[1]> = {},
): Parameters<typeof appendArchiveEntryHandler>[1] {
  const entryKind = overrides.entryKind ?? 'user_message';
  const isStructured = entryKind === 'tool_call' || entryKind === 'tool_result';
  const isBodyless = entryKind === 'process_event';

  return {
    projectId: overrides.projectId ?? 'project-archive-1',
    processId: overrides.processId ?? 'process-archive-1',
    entryKind,
    finalizationKey:
      overrides.finalizationKey ?? `${entryKind}:${Math.random().toString(36).slice(2, 8)}`,
    sourceObjectId: overrides.sourceObjectId ?? `${entryKind}-source`,
    bodyText:
      overrides.bodyText ??
      (isBodyless ? null : isStructured ? null : `Finalized ${entryKind} body.`),
    bodyData: overrides.bodyData ?? (isStructured ? { jsonText: `{"kind":"${entryKind}"}` } : null),
    bodyFormat:
      overrides.bodyFormat ?? (isBodyless ? 'none' : isStructured ? 'structured' : 'plain_text'),
    relatedArtifactVersionId: overrides.relatedArtifactVersionId ?? null,
    relatedSourceProvenanceId: overrides.relatedSourceProvenanceId ?? null,
    relatedToolCallId: overrides.relatedToolCallId ?? null,
    entryStatus: overrides.entryStatus ?? 'ready',
    degradationReason: overrides.degradationReason ?? null,
    recordedAt: overrides.recordedAt ?? '2026-05-01T10:05:00.000Z',
  };
}

describe('convex/archiveEntries', () => {
  it('TC-1.2a accepts required archive entry kinds', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildArchiveSeed(),
      archiveEntries: [],
    });
    const requiredKinds = [
      'user_message',
      'model_message',
      'reasoning',
      'script_emission',
      'tool_call',
      'tool_result',
      'process_event',
    ] as const;

    for (const [index, entryKind] of requiredKinds.entries()) {
      const entry = await appendArchiveEntryHandler(
        ctx,
        buildAppendArgs({
          entryKind,
          finalizationKey: `${entryKind}:${index}`,
          recordedAt: `2026-05-01T10:05:0${index}.000Z`,
        }),
      );

      expect(entry).toMatchObject({
        entryKind,
        sequence: index,
        lifecycleState: 'finalized',
      });
    }

    const page = await listArchiveEntriesHandler(ctx, {
      processId: 'process-archive-1',
      limit: 20,
    });

    expect(page.entries.map((entry) => entry.entryKind)).toEqual(requiredKinds);
  });

  it('TC-1.2b rejects unsupported archive entry kind', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildArchiveSeed(),
      archiveEntries: [],
    });

    await expect(
      appendArchiveEntryHandler(
        ctx,
        buildAppendArgs({
          entryKind: 'unsupported_kind' as never,
          finalizationKey: 'unsupported:1',
        }),
      ),
    ).rejects.toThrow('Unsupported archive entry kind: unsupported_kind');

    await expect(
      listArchiveEntriesHandler(ctx, {
        processId: 'process-archive-1',
        limit: 20,
      }),
    ).resolves.toMatchObject({
      entries: [],
    });
  });

  it('TC-1.3a reads entries in stable sequence order', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildArchiveSeed(),
      archiveEntries: [],
    });

    await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'model_message',
        finalizationKey: 'model:late-timestamp',
        recordedAt: '2026-05-01T10:06:00.000Z',
      }),
    );
    await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'user_message',
        finalizationKey: 'user:early-timestamp',
        recordedAt: '2026-05-01T10:05:00.000Z',
      }),
    );

    const page = await listArchiveEntriesHandler(ctx, {
      processId: 'process-archive-1',
      limit: 20,
    });

    expect(
      page.entries.map((entry) => [entry.sequence, entry.finalizationKey, entry.recordedAt]),
    ).toEqual([
      [0, 'model:late-timestamp', '2026-05-01T10:06:00.000Z'],
      [1, 'user:early-timestamp', '2026-05-01T10:05:00.000Z'],
    ]);
  });

  it('TC-1.3b same timestamp entries remain deterministic', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildArchiveSeed(),
      archiveEntries: [],
    });

    await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'tool_call',
        finalizationKey: 'tool:lint:call',
        relatedToolCallId: 'tool-call-1',
        recordedAt: '2026-05-01T10:07:00.000Z',
      }),
    );
    await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'tool_result',
        finalizationKey: 'tool:lint:result',
        relatedToolCallId: 'tool-call-1',
        recordedAt: '2026-05-01T10:07:00.000Z',
      }),
    );

    const page = await listArchiveEntriesHandler(ctx, {
      processId: 'process-archive-1',
      limit: 20,
    });

    expect(page.entries.map((entry) => [entry.sequence, entry.finalizationKey])).toEqual([
      [0, 'tool:lint:call'],
      [1, 'tool:lint:result'],
    ]);
  });

  it('TC-2.3b replayed completion does not duplicate entry', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildArchiveSeed(),
      archiveEntries: [],
    });

    const first = await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'model_message',
        finalizationKey: 'model:completed-1',
        bodyText: 'First finalized response.',
      }),
    );
    const replay = await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'model_message',
        finalizationKey: 'model:completed-1',
        bodyText: 'Replayed finalized response.',
      }),
    );
    const page = await listArchiveEntriesHandler(ctx, {
      processId: 'process-archive-1',
      limit: 20,
    });

    expect(replay).toEqual(first);
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]).toMatchObject({
      archiveEntryId: first.archiveEntryId,
      bodyText: 'First finalized response.',
      sequence: 0,
    });
  });

  it('TC-1.4a and TC-1.4b store related context ids and keep pages readable when related context is missing', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildArchiveSeed(),
      archiveEntries: [],
    });

    await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'user_message',
        finalizationKey: 'user:1',
        recordedAt: '2026-05-01T10:08:00.000Z',
      }),
    );
    await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'process_event',
        finalizationKey: 'event:with-related-context',
        relatedArtifactVersionId: 'artifact-version-1',
        relatedSourceProvenanceId: 'provenance-1',
        relatedToolCallId: 'tool-call-7',
        recordedAt: '2026-05-01T10:08:01.000Z',
      }),
    );
    await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        entryKind: 'process_event',
        finalizationKey: 'event:missing-related-context',
        relatedArtifactVersionId: 'artifact-version-missing',
        relatedSourceProvenanceId: 'provenance-missing',
        relatedToolCallId: 'tool-call-missing',
        recordedAt: '2026-05-01T10:08:02.000Z',
      }),
    );

    const firstPage = await listArchiveEntriesHandler(ctx, {
      processId: 'process-archive-1',
      limit: 2,
    });
    const secondPage = await listArchiveEntriesHandler(ctx, {
      processId: 'process-archive-1',
      cursor: firstPage.page.nextCursor,
      limit: 2,
    });

    expect(firstPage.page).toEqual({
      cursor: null,
      nextCursor: '1',
      hasMore: true,
    });
    expect(firstPage.entries[1]).toMatchObject({
      finalizationKey: 'event:with-related-context',
      relatedArtifactVersionId: 'artifact-version-1',
      relatedSourceProvenanceId: 'provenance-1',
      relatedToolCallId: 'tool-call-7',
    });
    expect(secondPage.entries).toEqual([
      expect.objectContaining({
        finalizationKey: 'event:missing-related-context',
        relatedArtifactVersionId: 'artifact-version-missing',
        relatedSourceProvenanceId: 'provenance-missing',
        relatedToolCallId: 'tool-call-missing',
      }),
    ]);
  });

  it('sequence assignment is atomic across same-process appends', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildArchiveSeed(),
      archiveEntries: [],
    });

    const first = await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        processId: 'process-archive-1',
        finalizationKey: 'process-1:first',
      }),
    );
    const second = await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        processId: 'process-archive-1',
        finalizationKey: 'process-1:second',
      }),
    );
    const otherProcess = await appendArchiveEntryHandler(
      ctx,
      buildAppendArgs({
        processId: 'process-archive-2',
        finalizationKey: 'process-2:first',
      }),
    );

    expect([first.sequence, second.sequence, otherProcess.sequence]).toEqual([0, 1, 0]);
  });
});

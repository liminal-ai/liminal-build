import { describe, expect, it } from 'vitest';
import {
  listProcessSideWorkItems,
  replaceCurrentProcessSideWorkItems,
} from './processSideWorkItems.js';
import { createFakeConvexContext } from './test-helpers/fake-convex-context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const listProcessSideWorkItemsHandler = getHandler<
  { processId: string },
  Array<{
    sideWorkId: string;
    displayLabel: string;
    purposeSummary: string;
    status: 'running' | 'completed' | 'failed';
    resultSummary: string | null;
    updatedAt: string;
  }>
>(listProcessSideWorkItems);

const replaceCurrentProcessSideWorkItemsHandler = getHandler<
  {
    processId: string;
    items: Array<{
      sideWorkId?: string;
      displayLabel: string;
      purposeSummary: string;
      status: 'running' | 'completed' | 'failed';
      resultSummary: string | null;
      updatedAt?: string;
    }>;
  },
  Array<{
    sideWorkId: string;
    displayLabel: string;
    purposeSummary: string;
    status: 'running' | 'completed' | 'failed';
    resultSummary: string | null;
    updatedAt: string;
  }>
>(replaceCurrentProcessSideWorkItems);

function buildSideWorkSeed() {
  return {
    projects: [
      {
        _id: 'project-1',
        _creationTime: 1,
        name: 'Project One',
        ownerUserId: 'user-1',
        processCount: 1,
        artifactCount: 0,
        sourceAttachmentCount: 0,
        lastUpdatedAt: '2026-04-15T12:00:00.000Z',
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: 'process-1',
        _creationTime: 2,
        projectId: 'project-1',
        processType: 'FeatureSpecification',
        displayLabel: 'Feature Spec #1',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
      {
        _id: 'process-2',
        _creationTime: 3,
        projectId: 'project-1',
        processType: 'FeatureSpecification',
        displayLabel: 'Feature Spec #2',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processSideWorkItems: [
      {
        _id: 'side-work-running-1',
        _creationTime: 4,
        processId: 'process-1',
        displayLabel: 'Validation Run',
        purposeSummary: 'Verify the draft against the source material.',
        status: 'running',
        resultSummary: null,
        updatedAt: '2026-04-15T12:05:00.000Z',
      },
      {
        _id: 'side-work-completed-1',
        _creationTime: 5,
        processId: 'process-1',
        displayLabel: 'Reference Sweep',
        purposeSummary: 'Gather additional references.',
        status: 'completed',
        resultSummary: 'Three relevant references were added.',
        updatedAt: '2026-04-15T12:09:00.000Z',
      },
      {
        _id: 'side-work-failed-1',
        _creationTime: 6,
        processId: 'process-1',
        displayLabel: 'Environment Check',
        purposeSummary: 'Confirm workspace prerequisites.',
        status: 'failed',
        resultSummary: 'Repository access expired.',
        updatedAt: '2026-04-15T12:08:00.000Z',
      },
      {
        _id: 'side-work-other-process-1',
        _creationTime: 7,
        processId: 'process-2',
        displayLabel: 'Other Process Task',
        purposeSummary: 'Should not be writable from process 1.',
        status: 'running',
        resultSummary: null,
        updatedAt: '2026-04-15T12:07:00.000Z',
      },
    ],
  };
}

describe('convex/processSideWorkItems', () => {
  it('returns active side work first and remaining items by updatedAt descending', async () => {
    const { ctx } = createFakeConvexContext(buildSideWorkSeed());

    await expect(
      listProcessSideWorkItemsHandler(ctx, {
        processId: 'process-1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        sideWorkId: 'side-work-running-1',
        status: 'running',
      }),
      expect.objectContaining({
        sideWorkId: 'side-work-completed-1',
        status: 'completed',
      }),
      expect.objectContaining({
        sideWorkId: 'side-work-failed-1',
        status: 'failed',
      }),
    ]);
  });

  it('replaces the current visible side-work set and removes omitted stale items', async () => {
    const { ctx, db } = createFakeConvexContext(buildSideWorkSeed());

    const items = await replaceCurrentProcessSideWorkItemsHandler(ctx, {
      processId: 'process-1',
      items: [
        {
          sideWorkId: 'side-work-running-1',
          displayLabel: 'Validation Run',
          purposeSummary: 'Verify the draft against the source material.',
          status: 'completed',
          resultSummary: 'Validation finished successfully.',
          updatedAt: '2026-04-15T12:12:00.000Z',
        },
        {
          displayLabel: 'Security Review',
          purposeSummary: 'Review the auth flow changes.',
          status: 'running',
          resultSummary: null,
          updatedAt: '2026-04-15T12:11:00.000Z',
        },
      ],
    });

    expect(items).toEqual([
      expect.objectContaining({
        displayLabel: 'Security Review',
        status: 'running',
      }),
      expect.objectContaining({
        sideWorkId: 'side-work-running-1',
        status: 'completed',
        resultSummary: 'Validation finished successfully.',
      }),
    ]);
    expect(
      db
        .list('processSideWorkItems')
        .filter((item) => item.processId === 'process-1')
        .map((item) => item._id),
    ).toEqual(expect.arrayContaining([items[0]?.sideWorkId, 'side-work-running-1']));
    expect(
      db
        .list('processSideWorkItems')
        .filter((item) => item.processId === 'process-1')
        .map((item) => item._id),
    ).not.toContain('side-work-completed-1');
    expect(
      db
        .list('processSideWorkItems')
        .filter((item) => item.processId === 'process-1')
        .map((item) => item._id),
    ).not.toContain('side-work-failed-1');
  });

  it('rejects updating side work that belongs to another process', async () => {
    const { ctx } = createFakeConvexContext(buildSideWorkSeed());

    await expect(
      replaceCurrentProcessSideWorkItemsHandler(ctx, {
        processId: 'process-1',
        items: [
          {
            sideWorkId: 'side-work-other-process-1',
            displayLabel: 'Other Process Task',
            purposeSummary: 'Should not be writable from process 1.',
            status: 'completed',
            resultSummary: 'Not allowed.',
          },
        ],
      }),
    ).rejects.toThrow('Current side work must already belong to the same process.');
  });
});

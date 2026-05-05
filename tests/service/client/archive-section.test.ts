// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  getDerivedArchiveViewsRouteSchema,
  getProcessArchiveRouteSchema,
  getProcessArchiveTurnsRouteSchema,
  postRefreshDerivedArchiveViewsRouteSchema,
} from '../../../apps/platform/server/schemas/archive.js';
import { ProcessHistoryCompatService } from '../../../apps/platform/server/services/archive/process-history-compat.service.js';
import {
  archiveDerivedViewRefreshRequestSchema,
  archiveEntrySchema,
  buildProcessArchiveApiPath,
  buildProcessArchivePath,
  buildProcessArchiveTurnsApiPath,
  buildProcessDerivedArchiveViewsApiPath,
  buildProcessDerivedArchiveViewsRefreshApiPath,
  requestErrorSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  allArchiveEntryKindsFixture,
  archiveDerivationConflictErrorFixture,
  degradedArchiveEntryFixture,
  invalidArchiveRequestErrorFixture,
  readyArchivePageFixture,
  readyArchiveTurnPageFixture,
  readyDerivedArchiveViewsFixture,
  refreshedDerivedArchiveViewsFixture,
} from '../../fixtures/archive.js';
import {
  processEventHistoryFixture,
  processMessageHistoryFixture,
  progressUpdateHistoryFixture,
  userMessageHistoryFixture,
} from '../../fixtures/process-history.js';

describe('Epic 07 Story 0 archive foundation contracts', () => {
  it('defines the shared archive route and endpoint vocabulary once', () => {
    expect(
      buildProcessArchivePath({
        projectId: 'project-1',
        processId: 'process-1',
      }),
    ).toBe('/projects/project-1/processes/process-1/archive');
    expect(
      buildProcessArchiveApiPath({
        projectId: 'project-1',
        processId: 'process-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/archive');
    expect(
      buildProcessArchiveTurnsApiPath({
        projectId: 'project-1',
        processId: 'process-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/archive/turns');
    expect(
      buildProcessDerivedArchiveViewsApiPath({
        projectId: 'project-1',
        processId: 'process-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/archive/derived-views');
    expect(
      buildProcessDerivedArchiveViewsRefreshApiPath({
        projectId: 'project-1',
        processId: 'process-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/archive/derived-views/refresh');
  });

  it('accepts all Epic 7 archive entry kinds and rejects non-finalized entries', () => {
    for (const fixture of allArchiveEntryKindsFixture) {
      expect(archiveEntrySchema.parse(fixture)).toMatchObject({
        archiveEntryId: fixture.archiveEntryId,
        entryKind: fixture.entryKind,
      });
    }

    expect(() =>
      archiveEntrySchema.parse({
        ...allArchiveEntryKindsFixture[0],
        lifecycleState: 'current',
      }),
    ).toThrow();
  });

  it('validates archive request errors against the documented code and status pairs', () => {
    expect(requestErrorSchema.parse(archiveDerivationConflictErrorFixture)).toMatchObject({
      code: 'ARCHIVE_DERIVATION_CONFLICT',
      status: 409,
    });
    expect(requestErrorSchema.parse(invalidArchiveRequestErrorFixture)).toMatchObject({
      code: 'INVALID_ARCHIVE_REQUEST',
      status: 422,
    });
    expect(() =>
      requestErrorSchema.parse({
        code: 'ARCHIVE_DERIVATION_CONFLICT',
        message: 'Wrong status for archive conflict.',
        status: 422,
      }),
    ).toThrow();
  });

  it('encodes archive route pagination and empty refresh validation in the server schemas', () => {
    expect(
      getProcessArchiveRouteSchema.querystring.parse({
        cursor: '6',
        limit: '200',
      }),
    ).toEqual({
      cursor: '6',
      limit: 200,
    });
    expect(
      getProcessArchiveTurnsRouteSchema.querystring.parse({
        cursor: '1',
        limit: '100',
      }),
    ).toEqual({
      cursor: '1',
      limit: 100,
    });
    expect(() =>
      getProcessArchiveRouteSchema.querystring.parse({
        limit: 201,
      }),
    ).toThrow();
    expect(
      getDerivedArchiveViewsRouteSchema.params.parse({
        projectId: 'project-1',
        processId: 'process-1',
      }),
    ).toMatchObject({
      projectId: 'project-1',
      processId: 'process-1',
    });
    expect(archiveDerivedViewRefreshRequestSchema.parse({})).toEqual({});
    expect(postRefreshDerivedArchiveViewsRouteSchema.body.parse({})).toEqual({});
    expect(() => archiveDerivedViewRefreshRequestSchema.parse({ unexpected: true })).toThrow();
  });

  it('fixtures cover ready and degraded archive entries, turns, derived views, and pages', () => {
    expect(archiveEntrySchema.parse(degradedArchiveEntryFixture)).toMatchObject({
      entryStatus: 'degraded',
    });
    expect(getProcessArchiveRouteSchema.response[200].parse(readyArchivePageFixture)).toMatchObject(
      {
        entries: expect.arrayContaining([expect.objectContaining({ entryKind: 'user_message' })]),
      },
    );
    expect(
      getProcessArchiveTurnsRouteSchema.response[200].parse(readyArchiveTurnPageFixture),
    ).toMatchObject({
      turns: expect.arrayContaining([
        expect.objectContaining({ turnStatus: 'ready' }),
        expect.objectContaining({ turnStatus: 'degraded' }),
      ]),
    });
    expect(
      getDerivedArchiveViewsRouteSchema.response[200].parse(readyDerivedArchiveViewsFixture),
    ).toMatchObject({
      views: expect.arrayContaining([
        expect.objectContaining({ viewKind: 'turn_range' }),
        expect.objectContaining({ viewKind: 'chunk_candidate' }),
      ]),
    });
    expect(
      postRefreshDerivedArchiveViewsRouteSchema.response[200].parse(
        refreshedDerivedArchiveViewsFixture,
      ),
    ).toMatchObject({
      refreshStatus: 'settled',
    });
  });

  it('maps finalized compatible process-history items into archive seeds without backfilling unsupported rows', () => {
    const compatService = new ProcessHistoryCompatService();

    expect(
      compatService.mapHistoryItemToArchiveSeed({
        projectId: 'project-1',
        processId: 'process-1',
        historyItem: userMessageHistoryFixture,
      }),
    ).toMatchObject({
      entryKind: 'user_message',
      finalizationKey: `response:${userMessageHistoryFixture.historyItemId}`,
      bodyText: userMessageHistoryFixture.text,
    });
    expect(
      compatService.mapHistoryItemToArchiveSeed({
        projectId: 'project-1',
        processId: 'process-1',
        historyItem: processMessageHistoryFixture,
      }),
    ).toMatchObject({
      entryKind: 'model_message',
      finalizationKey: `model:${processMessageHistoryFixture.historyItemId}`,
      bodyText: processMessageHistoryFixture.text,
    });
    expect(
      compatService.mapHistoryItemToArchiveSeed({
        projectId: 'project-1',
        processId: 'process-1',
        historyItem: processEventHistoryFixture,
      }),
    ).toMatchObject({
      entryKind: 'process_event',
    });
    expect(
      compatService.mapHistoryItemToArchiveSeed({
        projectId: 'project-1',
        processId: 'process-1',
        historyItem: progressUpdateHistoryFixture,
      }),
    ).toBeNull();
  });
});

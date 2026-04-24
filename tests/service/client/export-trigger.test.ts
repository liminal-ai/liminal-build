// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderExportTrigger } from '../../../apps/platform/client/features/review/export-trigger.js';
import type {
  ExportPackageResponse,
  RequestError,
} from '../../../apps/platform/shared/contracts/index.js';
import { exportPackageResponseFixture } from '../../fixtures/export-responses.js';

describe('export trigger', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('TC-5.1a renders a download link after a successful export request', () => {
    const onExport = vi.fn();
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: exportPackageResponseFixture,
      error: null,
      targetDocument: document,
      onExport,
      onExportExpired: vi.fn(),
    });

    const link = trigger.querySelector('[data-export-download-link="package-001"]');

    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe(exportPackageResponseFixture.downloadUrl);
    expect(link?.getAttribute('download')).toBe(exportPackageResponseFixture.downloadName);
  });

  it('renders export status updates inside a polite aria-live region', () => {
    const loadingTrigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: true,
      lastExport: null,
      error: null,
      targetDocument: document,
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
    });
    const loadingRegion = loadingTrigger.querySelector('[data-export-status-region="package-001"]');

    expect(loadingRegion?.getAttribute('aria-live')).toBe('polite');
    expect(loadingRegion?.getAttribute('aria-atomic')).toBe('true');
    expect(loadingRegion?.textContent).toContain('Preparing package export...');

    const successTrigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: exportPackageResponseFixture,
      error: null,
      targetDocument: document,
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
    });
    const successRegion = successTrigger.querySelector('[data-export-status-region="package-001"]');

    expect(successRegion?.textContent).toContain(
      `Download expires at ${exportPackageResponseFixture.expiresAt}`,
    );

    const errorTrigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: null,
      error: {
        code: 'REVIEW_EXPORT_FAILED',
        message: 'Export preparation failed.',
        status: 503,
      },
      targetDocument: document,
      onExport: vi.fn(),
      onExportExpired: vi.fn(),
    });
    const errorRegion = errorTrigger.querySelector('[data-export-status-region="package-001"]');

    expect(errorRegion?.textContent).toContain('Export preparation failed.');
  });

  it('TC-5.3a keeps the export affordance interactive when export preparation fails', () => {
    const onExport = vi.fn();
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: null,
      error: {
        code: 'REVIEW_EXPORT_FAILED',
        message: 'Export preparation failed.',
        status: 503,
      },
      targetDocument: document,
      onExport,
      onExportExpired: vi.fn(),
    });

    const button = trigger.querySelector('button');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Expected the export trigger to render a button.');
    }

    button.click();

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(trigger.textContent).toContain('Export preparation failed.');
  });

  it('TC-5.3b supports re-exporting after a previous download expired', () => {
    const onExport = vi.fn();
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: exportPackageResponseFixture,
      error: null,
      targetDocument: document,
      onExport,
      onExportExpired: vi.fn(),
    });

    const button = trigger.querySelector('button');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Expected the export trigger to render a button.');
    }

    button.click();

    expect(button.textContent).toBe('Export again');
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('does not navigate and surfaces a re-export affordance when the stored export is already expired', () => {
    const onExport = vi.fn();
    let lastExport: ExportPackageResponse | null = {
      ...exportPackageResponseFixture,
      expiresAt: '2000-01-01T00:00:00.000Z',
    };
    let error: RequestError | null = null;
    const root = document.createElement('div');

    const render = () => {
      root.replaceChildren(
        renderExportTrigger({
          packageId: 'package-001',
          isExporting: false,
          lastExport,
          error,
          targetDocument: document,
          onExport,
          onExportExpired: () => {
            lastExport = null;
            error = {
              code: 'REVIEW_TARGET_NOT_FOUND',
              message: 'Download link expired. Request a new export.',
              status: 404,
            };
            render();
          },
        }),
      );
    };
    render();

    const link = root.querySelector('[data-export-download-link="package-001"]');
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('Expected the export trigger to render a download link.');
    }

    const wasNotCanceled = link.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(wasNotCanceled).toBe(false);
    expect(root.querySelector('[data-export-download-link="package-001"]')).toBeNull();
    expect(root.textContent).toContain('Export package');
    expect(root.textContent).toContain('Download link expired. Request a new export.');
  });

  it('downloads the export with fetch when the stored link is still valid', async () => {
    const onExport = vi.fn();
    const onExportExpired = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('package-bytes', {
        status: 200,
        headers: { 'content-type': 'application/gzip' },
      }),
    );
    const createObjectURL = vi.fn().mockReturnValue('blob:review-export');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function click(this: HTMLAnchorElement) {
        this.setAttribute('data-clicked', 'true');
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: {
        ...exportPackageResponseFixture,
        expiresAt: '2999-01-01T00:00:00.000Z',
      },
      error: null,
      targetDocument: document,
      onExport,
      onExportExpired,
    });

    const link = trigger.querySelector('[data-export-download-link="package-001"]');
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('Expected the export trigger to render a download link.');
    }

    const wasNotCanceled = link.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(createObjectURL).toHaveBeenCalledTimes(1);
    });

    expect(wasNotCanceled).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(exportPackageResponseFixture.downloadUrl, {
      credentials: 'include',
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:review-export');
    expect(onExportExpired).not.toHaveBeenCalled();
  });

  it('calls onExportExpired and skips file download when the server rejects the download URL', async () => {
    const onExportExpired = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('missing', {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      }),
    );
    const createObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: {
        ...exportPackageResponseFixture,
        expiresAt: '2999-01-01T00:00:00.000Z',
      },
      error: null,
      targetDocument: document,
      onExport: vi.fn(),
      onExportExpired,
    });

    const link = trigger.querySelector('[data-export-download-link="package-001"]');
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('Expected the export trigger to render a download link.');
    }

    const wasNotCanceled = link.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(onExportExpired).toHaveBeenCalledTimes(1);
    });

    expect(wasNotCanceled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it.each([
    403, 503,
  ])('keeps the download link when the export download fetch returns %s', async (status) => {
    const onExportExpired = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('transient failure', {
        status,
        headers: { 'content-type': 'text/plain' },
      }),
    );
    const createObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
    const trigger = renderExportTrigger({
      packageId: 'package-001',
      isExporting: false,
      lastExport: {
        ...exportPackageResponseFixture,
        expiresAt: '2999-01-01T00:00:00.000Z',
      },
      error: null,
      targetDocument: document,
      onExport: vi.fn(),
      onExportExpired,
    });

    const link = trigger.querySelector('[data-export-download-link="package-001"]');
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('Expected the export trigger to render a download link.');
    }

    const wasNotCanceled = link.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(wasNotCanceled).toBe(false);
    expect(onExportExpired).not.toHaveBeenCalled();
    expect(trigger.querySelector('[data-export-download-link="package-001"]')).toBe(link);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

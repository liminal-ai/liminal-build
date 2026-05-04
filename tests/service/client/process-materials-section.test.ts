import { describe, expect, it } from 'vitest';
import { renderProcessMaterialsSection } from '../../../apps/platform/client/features/processes/process-materials-section.js';
import {
  mixedAccessProcessMaterialsFixture,
  readyProcessMaterialsFixture,
  writableProcessMaterialsFixture,
} from '../../fixtures/materials.js';

describe('process materials section — source accessMode', () => {
  it('TC-2.3a identifies a read-only source', () => {
    const view = renderProcessMaterialsSection({
      envelope: readyProcessMaterialsFixture,
      targetDocument: document,
    });

    const sourceItem = view.querySelector('[data-process-material-kind="source"]');
    expect(sourceItem).not.toBeNull();
    expect(view.textContent).toContain('Access: read only');
  });

  it('TC-2.3b identifies a writable source', () => {
    const view = renderProcessMaterialsSection({
      envelope: writableProcessMaterialsFixture,
      targetDocument: document,
    });

    const sourceItem = view.querySelector('[data-process-material-kind="source"]');
    expect(sourceItem).not.toBeNull();
    expect(view.textContent).toContain('Access: read write');
  });

  it('keeps read-only and writable rows distinguishable via the data-access-mode attribute', () => {
    const view = renderProcessMaterialsSection({
      envelope: mixedAccessProcessMaterialsFixture,
      targetDocument: document,
    });

    const readOnlyItem = view.querySelector('[data-access-mode="read_only"]');
    const readWriteItem = view.querySelector('[data-access-mode="read_write"]');

    expect(readOnlyItem).not.toBeNull();
    expect(readWriteItem).not.toBeNull();
  });

  it('TC-1.2a renders repository identity and attachment scope for current sources', () => {
    const view = renderProcessMaterialsSection({
      envelope: readyProcessMaterialsFixture,
      targetDocument: document,
    });

    expect(view.textContent).toContain(
      `Repository: ${readyProcessMaterialsFixture.currentSources[0]?.repositoryFullName ?? ''}`,
    );
    expect(view.textContent).toContain(
      `Scope: ${readyProcessMaterialsFixture.currentSources[0]?.attachmentScope ?? ''}`,
    );
  });
});

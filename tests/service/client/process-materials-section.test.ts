import { describe, expect, it } from 'vitest';
import { renderProcessMaterialsSection } from '../../../apps/platform/client/features/processes/process-materials-section.js';
import {
  mixedAccessProcessMaterialsFixture,
  readyProcessMaterialsFixture,
  writableProcessMaterialsFixture,
} from '../../fixtures/materials.js';

describe('process materials section — source accessMode', () => {
  it('AC-2.5: read_only source renders "Access: read only"', () => {
    const view = renderProcessMaterialsSection({
      envelope: readyProcessMaterialsFixture,
      targetDocument: document,
    });

    const sourceItem = view.querySelector('[data-process-material-kind="source"]');
    expect(sourceItem).not.toBeNull();
    expect(view.textContent).toContain('Access: read only');
  });

  it('AC-2.5: read_write source renders "Access: read write"', () => {
    const view = renderProcessMaterialsSection({
      envelope: writableProcessMaterialsFixture,
      targetDocument: document,
    });

    const sourceItem = view.querySelector('[data-process-material-kind="source"]');
    expect(sourceItem).not.toBeNull();
    expect(view.textContent).toContain('Access: read write');
  });

  it('AC-2.5: read_only and read_write sources are distinguishable via data-access-mode attribute', () => {
    const view = renderProcessMaterialsSection({
      envelope: mixedAccessProcessMaterialsFixture,
      targetDocument: document,
    });

    const readOnlyItem = view.querySelector('[data-access-mode="read_only"]');
    const readWriteItem = view.querySelector('[data-access-mode="read_write"]');

    expect(readOnlyItem).not.toBeNull();
    expect(readWriteItem).not.toBeNull();
  });
});

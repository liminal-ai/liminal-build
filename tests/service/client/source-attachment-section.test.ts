import { describe, expect, it } from 'vitest';
import { renderSourceAttachmentSection } from '../../../apps/platform/client/features/projects/source-attachment-section.js';
import { sourceAttachmentSectionEnvelopeSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  notHydratedSourceFixture,
  processScopedSourceFixture,
  staleSourceFixture,
} from '../../fixtures/sources.js';

describe('source attachment section', () => {
  it('TC-3.4a through TC-3.4c render source identity, purpose, target ref, and hydration state', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [processScopedSourceFixture, notHydratedSourceFixture, staleSourceFixture],
      }),
      targetDocument: document,
    });

    expect(view.textContent).toContain(processScopedSourceFixture.displayName);
    expect(view.textContent).toContain(`Purpose: ${processScopedSourceFixture.purpose}`);
    expect(view.textContent).toContain(`Target ref: ${processScopedSourceFixture.targetRef}`);
    expect(view.textContent).toContain('Hydration: hydrated');
    expect(view.textContent).toContain('Hydration: not hydrated');
    expect(view.textContent).toContain('Hydration: stale');
  });

  it('TC-3.4d and TC-3.4e render process association context for process-scoped sources', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [processScopedSourceFixture],
      }),
      targetDocument: document,
    });

    expect(view.querySelectorAll('li')).toHaveLength(1);
    expect(view.textContent).toContain(
      `Attached to ${processScopedSourceFixture.processDisplayLabel}.`,
    );
  });
});

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderSourceAttachmentSection } from '../../../apps/platform/client/features/projects/source-attachment-section.js';
import { sourceAttachmentSectionEnvelopeSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  notHydratedSourceFixture,
  processScopedSourceFixture,
  staleSourceFixture,
} from '../../fixtures/sources.js';

describe('source attachment section', () => {
  it('TC-1.2a renders new source identity and scope', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [processScopedSourceFixture, notHydratedSourceFixture, staleSourceFixture],
      }),
      targetDocument: document,
    });

    expect(view.textContent).toContain(processScopedSourceFixture.displayName);
    expect(view.textContent).toContain(
      `Repository: ${processScopedSourceFixture.repositoryFullName}`,
    );
    expect(view.textContent).toContain(`Purpose: ${processScopedSourceFixture.purpose}`);
    expect(view.textContent).toContain(
      `Access: ${processScopedSourceFixture.accessMode.replaceAll('_', ' ')}`,
    );
    expect(view.textContent).toContain(`Target ref: ${processScopedSourceFixture.targetRef}`);
    expect(view.textContent).toContain('Hydration: hydrated');
    expect(view.textContent).toContain('Hydration: not hydrated');
    expect(view.textContent).toContain('Hydration: stale (rehydration required)');
  });

  it('TC-2.1a displays purpose access mode and target ref', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [processScopedSourceFixture],
      }),
      targetDocument: document,
    });

    expect(view.textContent).toContain(`Purpose: ${processScopedSourceFixture.purpose}`);
    expect(view.textContent).toContain(
      `Access: ${processScopedSourceFixture.accessMode.replaceAll('_', ' ')}`,
    );
    expect(view.textContent).toContain(`Target ref: ${processScopedSourceFixture.targetRef}`);
  });

  it('renders process association context for process-scoped sources', () => {
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

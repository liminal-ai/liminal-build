import { describe, expect, it } from 'vitest';
import { renderCurrentRequestPanel } from '../../../apps/platform/client/features/processes/current-request-panel.js';
import {
  currentProcessRequestFixture,
  followUpCurrentProcessRequestFixture,
} from '../../fixtures/process-surface.js';

describe('current request panel', () => {
  it('TC-3.1b follow-up question remains in the same current-process context', () => {
    const view = renderCurrentRequestPanel({
      currentRequest: followUpCurrentProcessRequestFixture,
      targetDocument: document,
    });

    expect(view.getAttribute('data-current-request-state')).toBe('unresolved');
    expect(view.textContent).toContain('Attention required');
    expect(view.textContent).toContain(followUpCurrentProcessRequestFixture.promptText);
  });

  it('TC-3.2a and TC-5.2a keep an unresolved request pinned and visible', () => {
    const view = renderCurrentRequestPanel({
      currentRequest: currentProcessRequestFixture,
      targetDocument: document,
    });

    expect(view.getAttribute('data-current-request-state')).toBe('unresolved');
    expect(view.textContent).toContain(currentProcessRequestFixture.promptText);
    expect(view.textContent).toContain(`Kind: ${currentProcessRequestFixture.requestKind}`);
  });

  it('TC-3.2b updates the pinned request when the process asks a new follow-up', () => {
    const view = renderCurrentRequestPanel({
      currentRequest: followUpCurrentProcessRequestFixture,
      targetDocument: document,
    });

    expect(view.textContent).not.toContain(currentProcessRequestFixture.promptText);
    expect(view.textContent).toContain(followUpCurrentProcessRequestFixture.promptText);
  });

  it('TC-3.4a shows no false waiting state when there is no current request', () => {
    const view = renderCurrentRequestPanel({
      currentRequest: null,
      targetDocument: document,
    });

    expect(view.getAttribute('data-current-request-state')).toBe('none');
    expect(view.textContent).toContain('No unresolved request right now.');
    expect(view.textContent).not.toContain('Attention required');
  });

  it('TC-5.1b and TC-5.2b clear the pinned request once it is resolved', () => {
    const view = renderCurrentRequestPanel({
      currentRequest: null,
      targetDocument: document,
    });

    expect(view.getAttribute('data-current-request-state')).toBe('none');
    expect(view.textContent).toContain('No unresolved request right now.');
  });
});

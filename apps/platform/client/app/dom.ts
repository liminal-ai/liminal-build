import type { ShellBootstrapPayload } from '../../shared/contracts/index.js';

declare global {
  interface Window {
    __SHELL_BOOTSTRAP__?: ShellBootstrapPayload;
  }
}

export function clearElement(element: HTMLElement): void {
  element.replaceChildren();
}

export function createTextElement(
  targetDocument: Document,
  tagName: keyof HTMLElementTagNameMap,
  textContent: string,
): HTMLElementTagNameMap[keyof HTMLElementTagNameMap] {
  const element = targetDocument.createElement(tagName);
  element.textContent = textContent;
  return element;
}

export function getRequiredRootElement(targetDocument: Document): HTMLElement {
  const root = targetDocument.getElementById('app');
  const windowContext = targetDocument.defaultView;

  if (windowContext === null || !(root instanceof windowContext.HTMLElement)) {
    throw new Error('Story 0 scaffold expected a #app root element.');
  }

  return root;
}

export function getShellBootstrapPayload(
  targetWindow: Window & typeof globalThis,
): ShellBootstrapPayload | null {
  return targetWindow.__SHELL_BOOTSTRAP__ ?? null;
}

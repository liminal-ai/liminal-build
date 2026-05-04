import type {
  CreateSourceAttachmentRequest,
  SourceAttachmentSectionEnvelope,
  SourceAttachmentSummary,
  UpdateSourceAttachmentRequest,
} from '../../../shared/contracts/index.js';
import {
  appendSectionMessage,
  createSectionElement,
  renderSectionEnvelopeState,
} from './section-envelope.js';
import { renderSourceAttachmentComposer } from './source-attachment-composer.js';

const sourcePurposeOptions = [
  ['research', 'Research'],
  ['review', 'Review'],
  ['implementation', 'Implementation'],
  ['other', 'Other'],
] as const;

const sourceAccessModeOptions = [
  ['read_only', 'Read only'],
  ['read_write', 'Read write'],
] as const;

function formatHydrationStateLabel(hydrationState: string): string {
  if (hydrationState === 'stale') {
    return 'stale (rehydration required)';
  }

  return hydrationState.replaceAll('_', ' ');
}

function formatAccessModeLabel(accessMode: string): string {
  return accessMode.replaceAll('_', ' ');
}

function formatFreshnessReason(freshnessReason: string | null | undefined): string | null {
  if (freshnessReason === null || freshnessReason === undefined) {
    return null;
  }

  return freshnessReason.replaceAll('_', ' ');
}

function resolveRefreshLabel(sourceAttachment: SourceAttachmentSummary): string | null {
  const canRefreshFromProjectShell =
    sourceAttachment.attachmentScope === 'process' ||
    sourceAttachment.projectRefreshTargetCount === 1;

  if (!canRefreshFromProjectShell) {
    return null;
  }

  if (sourceAttachment.hydrationState === 'stale') {
    return 'Refresh source';
  }

  if (sourceAttachment.hydrationState === 'not_hydrated') {
    return 'Hydrate source';
  }

  return null;
}

export function renderSourceAttachmentSection(args: {
  envelope: SourceAttachmentSectionEnvelope | null;
  targetDocument: Document;
  onAttachSource?: (input: CreateSourceAttachmentRequest) => Promise<void>;
  onUpdateSource?: (
    sourceAttachmentId: string,
    input: UpdateSourceAttachmentRequest,
  ) => Promise<void>;
  onRefreshSource?: (sourceAttachmentId: string) => Promise<void>;
  onDetachSource?: (sourceAttachmentId: string) => Promise<void>;
}): HTMLElement {
  if (args.envelope === null || args.envelope.status !== 'ready') {
    const section = renderSectionEnvelopeState({
      title: 'Source attachments',
      envelope: args.envelope,
      targetDocument: args.targetDocument,
    });

    if (args.onAttachSource !== undefined) {
      section.append(
        renderSourceAttachmentComposer({
          title: 'Attach repository',
          description: 'Attach a GitHub repository to this project.',
          scope: 'project',
          submitLabel: 'Attach to project',
          targetDocument: args.targetDocument,
          onAttachSource: args.onAttachSource,
        }),
      );
    }

    return section;
  }

  const section = createSectionElement({
    title: 'Source attachments',
    targetDocument: args.targetDocument,
  });

  if (args.onAttachSource !== undefined) {
    section.append(
      renderSourceAttachmentComposer({
        title: 'Attach repository',
        description: 'Attach a GitHub repository to this project.',
        scope: 'project',
        submitLabel: 'Attach to project',
        targetDocument: args.targetDocument,
        onAttachSource: args.onAttachSource,
      }),
    );
  }

  const list = args.targetDocument.createElement('ul');

  if (args.envelope.items.length === 0) {
    return appendSectionMessage({
      section,
      message: 'No source attachments yet.',
      targetDocument: args.targetDocument,
    });
  }

  for (const sourceAttachment of args.envelope.items) {
    const item = args.targetDocument.createElement('li');
    const heading = args.targetDocument.createElement('strong');
    const repositoryIdentity = args.targetDocument.createElement('p');
    const purpose = args.targetDocument.createElement('p');
    const accessMode = args.targetDocument.createElement('p');
    const targetRef = args.targetDocument.createElement('p');
    const hydration = args.targetDocument.createElement('p');
    const lastHydratedAt = args.targetDocument.createElement('p');
    const freshnessReason = args.targetDocument.createElement('p');
    const scope = args.targetDocument.createElement('p');
    const updatedAt = args.targetDocument.createElement('p');
    item.setAttribute('data-source-attachment-row', sourceAttachment.sourceAttachmentId);

    heading.textContent = sourceAttachment.displayName;
    repositoryIdentity.textContent = `Repository: ${sourceAttachment.repositoryFullName}`;
    purpose.textContent = `Purpose: ${sourceAttachment.purpose}`;
    accessMode.textContent = `Access: ${formatAccessModeLabel(sourceAttachment.accessMode)}`;
    targetRef.textContent = `Target ref: ${sourceAttachment.targetRef ?? 'not set'}`;
    hydration.textContent = `Hydration: ${formatHydrationStateLabel(sourceAttachment.hydrationState)}`;
    lastHydratedAt.textContent = `Last hydrated: ${sourceAttachment.lastHydratedAt ?? 'never'}`;
    freshnessReason.textContent = `Freshness reason: ${formatFreshnessReason(sourceAttachment.freshnessReason) ?? 'none'}`;
    purpose.setAttribute(
      'data-source-attachment-purpose-display',
      sourceAttachment.sourceAttachmentId,
    );
    accessMode.setAttribute(
      'data-source-attachment-access-mode-display',
      sourceAttachment.sourceAttachmentId,
    );
    targetRef.setAttribute(
      'data-source-attachment-target-ref-display',
      sourceAttachment.sourceAttachmentId,
    );
    scope.textContent =
      sourceAttachment.attachmentScope === 'project'
        ? 'Project-scoped source attachment.'
        : `Attached to ${sourceAttachment.processDisplayLabel ?? sourceAttachment.processId ?? 'a process'}.`;
    updatedAt.textContent = `Updated: ${sourceAttachment.updatedAt}`;

    item.append(
      heading,
      repositoryIdentity,
      purpose,
      accessMode,
      targetRef,
      hydration,
      lastHydratedAt,
      freshnessReason,
      scope,
      updatedAt,
    );

    if (args.onUpdateSource !== undefined) {
      item.append(
        renderSourceAttachmentMetadataEditor({
          sourceAttachment,
          targetDocument: args.targetDocument,
          onUpdateSource: args.onUpdateSource,
        }),
      );
    }

    if (args.onRefreshSource !== undefined) {
      item.append(
        renderSourceAttachmentRefreshControl({
          sourceAttachment,
          targetDocument: args.targetDocument,
          onRefreshSource: args.onRefreshSource,
        }),
      );
    }

    if (args.onDetachSource !== undefined) {
      item.append(
        renderSourceAttachmentDetachControl({
          sourceAttachmentId: sourceAttachment.sourceAttachmentId,
          targetDocument: args.targetDocument,
          onDetachSource: args.onDetachSource,
        }),
      );
    }

    list.append(item);
  }

  section.append(list);
  return section;
}

function renderSourceAttachmentRefreshControl(args: {
  sourceAttachment: SourceAttachmentSummary;
  targetDocument: Document;
  onRefreshSource: (sourceAttachmentId: string) => Promise<void>;
}): HTMLElement {
  const container = args.targetDocument.createElement('div');
  const refreshLabel = resolveRefreshLabel(args.sourceAttachment);
  const status = args.targetDocument.createElement('p');

  status.setAttribute(
    'data-source-attachment-refresh-status',
    args.sourceAttachment.sourceAttachmentId,
  );

  if (args.sourceAttachment.refreshStatus === 'pending') {
    status.textContent = `Refresh in progress since ${args.sourceAttachment.refreshRequestedAt ?? 'just now'}.`;
  } else if (args.sourceAttachment.refreshStatus === 'failed') {
    status.textContent = 'The last refresh attempt failed.';
  }

  container.append(status);

  if (refreshLabel === null) {
    return container;
  }

  const button = args.targetDocument.createElement('button');
  button.type = 'button';
  button.textContent = refreshLabel;
  button.disabled = args.sourceAttachment.refreshStatus === 'pending';
  button.setAttribute(
    'data-source-attachment-refresh-submit',
    args.sourceAttachment.sourceAttachmentId,
  );

  button.addEventListener('click', () => {
    button.disabled = true;

    void Promise.resolve(args.onRefreshSource(args.sourceAttachment.sourceAttachmentId)).finally(
      () => {
        button.disabled = false;
      },
    );
  });

  container.append(button);
  return container;
}

function renderSourceAttachmentMetadataEditor(args: {
  sourceAttachment: SourceAttachmentSummary;
  targetDocument: Document;
  onUpdateSource: (
    sourceAttachmentId: string,
    input: UpdateSourceAttachmentRequest,
  ) => Promise<void>;
}): HTMLElement {
  const form = args.targetDocument.createElement('form');
  const purposeSelect = args.targetDocument.createElement('select');
  const accessModeSelect = args.targetDocument.createElement('select');
  const targetRefInput = args.targetDocument.createElement('input');
  const submitButton = args.targetDocument.createElement('button');
  const validation = args.targetDocument.createElement('p');

  form.setAttribute('data-source-attachment-edit-form', args.sourceAttachment.sourceAttachmentId);

  purposeSelect.setAttribute(
    'data-source-attachment-edit-purpose',
    args.sourceAttachment.sourceAttachmentId,
  );
  for (const [value, label] of sourcePurposeOptions) {
    const option = args.targetDocument.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === args.sourceAttachment.purpose;
    purposeSelect.append(option);
  }

  accessModeSelect.setAttribute(
    'data-source-attachment-edit-access-mode',
    args.sourceAttachment.sourceAttachmentId,
  );
  for (const [value, label] of sourceAccessModeOptions) {
    const option = args.targetDocument.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === args.sourceAttachment.accessMode;
    accessModeSelect.append(option);
  }

  targetRefInput.name = 'targetRef';
  targetRefInput.value = args.sourceAttachment.targetRef ?? '';
  targetRefInput.placeholder = 'Target ref (optional)';
  targetRefInput.setAttribute(
    'data-source-attachment-edit-target-ref',
    args.sourceAttachment.sourceAttachmentId,
  );

  submitButton.type = 'submit';
  submitButton.textContent = 'Update metadata';
  submitButton.setAttribute(
    'data-source-attachment-edit-submit',
    args.sourceAttachment.sourceAttachmentId,
  );

  validation.setAttribute(
    'data-source-attachment-edit-validation',
    args.sourceAttachment.sourceAttachmentId,
  );
  validation.setAttribute('role', 'alert');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    validation.textContent = '';
    submitButton.disabled = true;
    const targetRef = targetRefInput.value.trim();

    void Promise.resolve(
      args.onUpdateSource(args.sourceAttachment.sourceAttachmentId, {
        purpose: purposeSelect.value as UpdateSourceAttachmentRequest['purpose'],
        accessMode: accessModeSelect.value as UpdateSourceAttachmentRequest['accessMode'],
        targetRef: targetRef.length > 0 ? targetRef : null,
      }),
    ).finally(() => {
      submitButton.disabled = false;
    });
  });

  form.append(purposeSelect, accessModeSelect, targetRefInput, submitButton, validation);
  return form;
}

function renderSourceAttachmentDetachControl(args: {
  sourceAttachmentId: string;
  targetDocument: Document;
  onDetachSource: (sourceAttachmentId: string) => Promise<void>;
}): HTMLElement {
  const container = args.targetDocument.createElement('div');
  const button = args.targetDocument.createElement('button');

  button.type = 'button';
  button.textContent = 'Detach source';
  button.setAttribute('data-source-attachment-detach-submit', args.sourceAttachmentId);
  button.addEventListener('click', () => {
    button.disabled = true;

    void Promise.resolve(args.onDetachSource(args.sourceAttachmentId)).finally(() => {
      button.disabled = false;
    });
  });

  container.append(button);
  return container;
}
